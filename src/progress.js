import chalk from 'chalk';
import _ from 'lodash';
import pulse from './pulse';
import globals from './globals';
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
