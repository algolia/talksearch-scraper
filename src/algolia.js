import algoliasearch from 'algoliasearch';
import _ from 'lodash';
import pMap from 'p-map';
import chalk from 'chalk';
import pAll from 'p-all';
import pulse from './pulse';
import globals from './globals';
let client;
let indexes = {};
const defaultIndexSettings = {
  searchableAttributes: [
    'unordered(video.title)',
    'unordered(speakers.name)',
    'unordered(caption.content)',
  ],
  // Disable typo-tolerance on dates (1970-2030)
  disableTypoToleranceOnWords: _.times(60, year => `${1970 + year}`),
  customRanking: [
    'desc(video.hasCaptions)',
    'desc(video.popularity.score)',
    'desc(video.hasManualCaptions)',
    'desc(video.publishedDate.day)',
    'desc(video.duration.minutes)',
    'asc(video.positionInPlaylist)',
    'asc(caption.start)',
  ],
  attributesForFaceting: [
    'author.name',
    'speakers.name',
    'conference.name',
    'conference.year',
    'video.language',
    'video.hasManualCaptions',
    'video.id',
    'playlist.id',
    'playlist.title',
    'channel.id',
    'channel.title',
  ],
  distinct: true,
  attributeForDistinct: 'video.id',
};

function getLocalObjectIDs(records) {
  return _.map(records, 'objectID');
}

async function getRemoteObjectIDs() {
  // pulse.emit('remoteObjectIds:start');
  try {
    const browser = indexes.manifest.browseAll({
      attributesToRetrieve: 'content',
      hitsPerPage: 1000,
    });
    let objectIDs = [];

    // Return a promise, but only resolve it when we get to the end of the
    // browse. At each step, we save the list of objectIDs saved in the
    // manifest.
    return await new Promise((resolve, reject) => {
      browser.on('result', results => {
        _.each(results.hits, hit => {
          objectIDs = _.concat(objectIDs, hit.content);
        });
      });
      browser.on('end', () => {
        resolve(objectIDs);
      });
      browser.on('error', reject);
    });

    // pulse.emit('remoteObjectIds:end', results);
    // return results;
  } catch (err) {
    // Index does not (yet) exists
    pulse.emit('remoteObjectIds:error');
    return [];
  }
}

/**
 * Check if an index exists
 * @param {String} indexName Name of the index to test
 * @returns {Boolean} True if index exists, false otherwise
 *
 * There is no API endpoint to test if an index exists, so we test if we can get
 * the index settings.
 **/
async function indexExists(indexName) {
  try {
    await indexes[indexName].getSettings();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Create a copy of an existing index
 * @param {String} source Name of the source index
 * @param {String} destination Name of the destination index
 * @returns {Promise} Wait for the new index to be created
 **/
async function copyIndexSync(source, destination) {
  // If the source index does not exist, we simply create it. We can't copy an
  // empty index because we won't be able to wait for the task to finish.
  if (!await indexExists(source)) {
    console.info(`Creating ${source} index`);
    await indexes[source].setSettings({});
    return;
  }

  console.info(`Copy ${source} to ${destination}`);
  try {
    const response = await client.copyIndex(source, destination);
    await indexes[source].waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to copy index ${source} to ${destination}`);
  }
}

async function moveIndexSync(source, destination) {
  try {
    const response = await client.moveIndex(source, destination);
    await indexes[source].waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to move index ${source} to ${destination}`);
  }
}

async function clearIndexSync(indexName) {
  console.info(`Clear ${indexName} index`);
  try {
    const index = indexes[indexName];
    const response = await index.clearIndex();
    await index.waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to clear index ${indexName}`);
  }
}

async function setSettingsSync(indexName, settings) {
  console.info(`Update settings on ${indexName}`);
  try {
    const index = indexes[indexName];
    const response = await index.setSettings(settings);
    await index.waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to set settings to ${indexName}`);
  }
}

function buildDiffBatch(remoteIds, records, indexName) {
  const localIds = getLocalObjectIDs(records);

  const idsToDelete = _.difference(remoteIds, localIds);
  const idsToAdd = _.difference(localIds, remoteIds);
  const recordsById = _.keyBy(records, 'objectID');

  const deleteBatch = _.map(idsToDelete, objectID => ({
    action: 'deleteObject',
    indexName,
    body: {
      objectID,
    },
  }));
  const addBatch = _.map(idsToAdd, objectID => ({
    action: 'addObject',
    indexName,
    body: recordsById[objectID],
  }));
  console.info(`${deleteBatch.length} objects to delete`);
  console.info(`${addBatch.length} objects to add`);

  return _.concat(deleteBatch, addBatch);
}

function buildManifestBatch(records, indexName) {
  const objectIDs = getLocalObjectIDs(records);
  const chunks = _.chunk(objectIDs, 100);

  return _.map(chunks, chunk => ({
    action: 'addObject',
    indexName,
    body: {
      content: chunk,
    },
  }));
}

async function runBatchSync(batches, userOptions = {}) {
  const options = {
    batchSize: 1000,
    concurrency: 10,
    ...userOptions,
  };
  const chunks = _.chunk(batches, options.batchSize);
  console.info(
    `Pushing ${batches.length} operations in batches of ${options.batchSize}`
  );
  pulse.emit('batch:start', { uuid: options.uuid, chunkCount: chunks.length });

  await pMap(
    chunks,
    async (chunk, index) => {
      try {
        const response = await client.batch(chunk);

        // Now waiting for the batch to be executed on the indexes
        const taskIDPerIndex = response.taskID;
        await pMap(_.keys(taskIDPerIndex), async indexName => {
          const taskID = taskIDPerIndex[indexName];
          await indexes[indexName].waitTask(taskID);
        });

        pulse.emit('batch:chunk', options.uuid);
      } catch (err) {
        pulse.emit('batch:error', { uuid: options.uuid, batchIndex: index });
        errorHandler(err, `Unable to send batch #${index}`);
      }
    },
    { concurrency: options.concurrency }
  );

  pulse.emit('batch:end', options.uuid);
}

async function run(records) {
  client = algoliasearch(globals.algoliaAppId(), globals.algoliaApiKey());
  const config = globals.config();
  const indexName = config.indexName;
  const indexTmpName = `${indexName}_tmp`;
  const indexManifestName = `${indexName}_manifest`;
  const indexManifestTmpName = `${indexName}_manifest_tmp`;

  const index = client.initIndex(indexName);
  const indexTmp = client.initIndex(indexTmpName);
  const indexManifest = client.initIndex(indexManifestName);
  const indexManifestTmp = client.initIndex(indexManifestTmpName);

  // Global way to access indexes based on their names or aliases
  indexes = {
    prod: index,
    [indexName]: index,
    tmp: indexTmp,
    [indexTmpName]: indexTmp,
    manifest: indexManifest,
    [indexManifestName]: indexManifest,
    manifestTmp: indexManifestTmp,
    [indexManifestTmpName]: indexManifestTmp,
  };

  try {
    // What records are already in the app?
    const remoteIds = await getRemoteObjectIDs();

    // Create a tmp copy of the prod index to add our changes
    await copyIndexSync(indexName, indexTmpName);

    // Update settings
    let settings = defaultIndexSettings;
    const transformSettings = _.get(globals.config(), 'transformSettings');
    if (transformSettings) {
      settings = transformSettings(settings);
    }
    await setSettingsSync(indexTmpName, settings);

    // Apply the diff between local and remote on the temp index
    const diffBatch = buildDiffBatch(remoteIds, records, indexTmpName);
    await runBatchSync(diffBatch, { uuid: 'diff' });

    // Preparing a new manifest index
    await clearIndexSync(indexManifestTmpName);
    const manifestBatch = buildManifestBatch(records, indexManifestTmpName);
    await runBatchSync(manifestBatch, { uuid: 'manifest' });

    // Overwriting production indexes with temporary indexes
    await pAll([
      async () => {
        await moveIndexSync(indexManifestTmpName, indexManifestName);
        console.info('✔ Manifest overwritten');
      },
      async () => {
        await moveIndexSync(indexTmpName, indexName);
        console.info('✔ Production index overwritten');
      },
    ]);
    console.info('✔ All Done');
  } catch (err) {
    console.info(err);
    console.info('Unable to update records');
    // Clear tmp indices
  }
}

function errorHandler(err, customMessage) {
  // console.error(err);
  if (customMessage) {
    console.error(chalk.bold.red(customMessage));
  }
  if (err.message) {
    console.error(chalk.red(err.message));
  }
  throw new Error(customMessage || err.message || err);
}

const Algolia = {
  run,
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
  internals: {
    getLocalObjectIDs,
  },
};

export default Algolia;
