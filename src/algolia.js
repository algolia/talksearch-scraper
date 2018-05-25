import EventEmitter from 'events';
import algoliasearch from 'algoliasearch';
import _ from 'lodash';
import pMap from 'p-map';
import chalk from 'chalk';
import pAll from 'p-all';
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const pulse = new EventEmitter();
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const defaultIndexSettings = {
  searchableAttributes: [
    'video.title',
    'playlist.title',
    'unordered(caption.content)',
    'unordered(video.description)',
    'unordered(playlist.description)',
    'unordered(channel.title)',
  ],
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

let config = null;
let indexes = {};
function init(argv) {
  config = require(`../configs/${argv.config}.js`);
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
}

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

async function copyIndexSync(source, destination) {
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
  try {
    const index = indexes[indexName];
    const response = await index.clearIndex();
    await index.waitTask(response.taskID);
  } catch (err) {
    errorHandler(err, `Unable to clear index ${indexName}`);
  }
}

async function setSettingsSync(indexName, settings) {
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
          console.info(`Batch ${index} correctly executed`);
        });

        // pulse.emit('push:chunk', chunk.length);
      } catch (err) {
        errorHandler(err, `Unable to send batch #${index}`);
      }
    },
    { concurrency: options.concurrency }
  );

  console.info('All batches sent');
}

async function run(records) {
  const indexTmpName = indexes.tmp.indexName;
  const indexProdName = indexes.prod.indexName;
  const indexManifestTmpName = indexes.manifestTmp.indexName;
  const indexManifestName = indexes.manifest.indexName;

  try {
    // What records are already in the app?
    const remoteIds = await getRemoteObjectIDs();

    // Create a tmp copy of the prod index to add our changes
    await copyIndexSync(indexProdName, indexTmpName);
    console.info(`Create copy of prod index`);

    // Update settings
    await setSettingsSync(indexTmpName, defaultIndexSettings);
    console.info(`Updated tmp index settings`);

    // Apply the diff between local and remote on the temp index
    const diffBatch = buildDiffBatch(remoteIds, records, indexTmpName);
    console.info(`Sending ${diffBatch.length} batches orders`);
    await runBatchSync(diffBatch);

    // Preparing a new manifest index
    await clearIndexSync(indexManifestTmpName);
    console.info('Cleared tmp manifest index');
    const manifestBatch = buildManifestBatch(records, indexManifestTmpName);
    await runBatchSync(manifestBatch);

    // Overwriting production indexes with temporary indexes
    await pAll([
      async () => {
        await moveIndexSync(indexManifestTmpName, indexManifestName);
        console.info('Overwritten manifest');
      },
      async () => {
        await moveIndexSync(indexTmpName, indexProdName);
        console.info('Overwritten index');
      },
    ]);
    console.info('✔ Done');
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
  init,
  run,
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
  internals: {
    getLocalObjectIDs,
  },
};

export default Algolia;
