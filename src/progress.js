import chalk from 'chalk';
import _ from 'lodash';
import pulse from './pulse';
import globals from './globals';
import ora from 'ora';
import MultiProgressBar from 'multi-progress';
const progressBars = new MultiProgressBar();
const allBars = {};
const warnings = [];

function newBar(id, color, max) {
  const name = chalk[color](id);
  const bar = progressBars.newBar(`[${name}] [:bar] :current/:total`, {
    width: 90,
    total: max,
  });
  bar.tick(0);
  allBars[id] = bar;
}

function updateCursor() {
  if (process.stdout.cursorTo) {
    process.stdout.cursorTo(0, 10000);
  }
}

const youtube = {
  onCrawlingStart(data) {
    const name = globals.configName();
    const total = data.playlists.length;
    newBar(name, 'blue', total);
  },
  onCrawlingEnd() {
    updateCursor();
  },
  onVideos(data) {
    const videos = data.videos;
    console.info(`${videos.length} videos found`);
  },
  onPlaylistStart(data) {
    const playlistId = data.playlistId;
    const totalVideoCount = data.totalVideoCount;
    newBar(playlistId, 'green', totalVideoCount);
  },
  onPlaylistChunk(data) {
    const playlistId = data.playlistId;
    const chunkVideoCount = data.chunkVideoCount;
    allBars[playlistId].tick(chunkVideoCount);
  },
  onPlaylistEnd() {
    const name = globals.configName();
    allBars[name].tick();
  },
};

/* eslint-disable no-param-reassign */
const algolia = {
  onCopyIndexStart(data, context) {
    context[data.eventId] = ora(
      `Copying ${data.source} to ${data.destination}`
    ).start();
  },
  onMoveIndexStart(data, context) {
    context[data.eventId] = ora(
      `Moving ${data.source} to ${data.destination}`
    ).start();
  },
  onSetSettingsStart(data, context) {
    context[data.eventId] = ora(
      `Pushing settings to ${data.indexName}`
    ).start();
  },
  onClearIndexStart(data, context) {
    context[data.eventId] = ora(`Clearing index ${data.indexName}`).start();
  },
  onGetAllRecordsStart(data, context) {
    context[data.eventId] = ora(
      `Getting all objectIds from ${data.indexName}`
    ).start();
  },
  onBatchStart(data, context) {
    context[data.eventId] = ora(
      `Starting batch of ${data.batchCount} operations`
    ).start();
  },
  succeedEvent(data, context) {
    context[data.eventId].succeed();
  },
};
/* eslint-enable no-param-reassign */
pulse.on('algolia:copyIndex:start', algolia.onCopyIndexStart);
pulse.on('algolia:copyIndex:end', algolia.succeedEvent);
pulse.on('algolia:moveIndex:start', algolia.onMoveIndexStart);
pulse.on('algolia:moveIndex:end', algolia.succeedEvent);
pulse.on('algolia:clearIndex:start', algolia.onClearIndexStart);
pulse.on('algolia:clearIndex:end', algolia.succeedEvent);
pulse.on('algolia:getAllRecords:start', algolia.onGetAllRecordsStart);
pulse.on('algolia:getAllRecords:end', algolia.succeedEvent);
pulse.on('algolia:batch:start', algolia.onBatchStart);
pulse.on('algolia:batch:end', algolia.succeedEvent);
pulse.on('algolia:setSettings:start', algolia.onSetSettingsStart);
pulse.on('algolia:setSettings:end', algolia.succeedEvent);

const language = {
  onEnrichStart(data) {
    const progressName = chalk.cyan('Enriching');
    const chunkCount = data.videoCount;
    allBars.language = progressBars.newBar(
      `[${progressName}] [:bar] :current/:total`,
      {
        total: chunkCount,
        width: 70,
      }
    );
  },
  onEnrichChunk() {
    allBars.language.tick();
  },
  onEnrichEnd() {
    updateCursor();
  },
};

const generic = {
  onError(error, title) {
    console.info(chalk.red(title));
    console.error(error);
  },
  onWarning(title, details) {
    warnings.push({ title, details });
  },
};

function displayWarnings() {
  updateCursor();
  const groupedWarnings = _.groupBy(warnings, 'title');
  _.each(groupedWarnings, (typedWarnings, title) => {
    console.info(chalk.red(title));

    const displayedResult = _.flatten(_.map(typedWarnings, 'details')).join(
      '\n'
    );

    console.info(chalk.yellow(displayedResult));
  });
}

pulse.on('error', generic.onError);
pulse.on('warning', generic.onWarning);

pulse.on('youtube:crawling:start', youtube.onCrawlingStart);
pulse.on('youtube:crawling:end', youtube.onCrawlingEnd);
pulse.on('youtube:videos', youtube.onVideos);
pulse.on('playlist:start', youtube.onPlaylistStart);
pulse.on('playlist:chunk', youtube.onPlaylistChunk);
pulse.on('playlist:end', youtube.onPlaylistEnd);

pulse.on('enrich:start', language.onEnrichStart);
pulse.on('enrich:chunk', language.onEnrichChunk);
pulse.on('enrich:end', language.onEnrichEnd);

const progress = {
  displayWarnings,
};

export default progress;
