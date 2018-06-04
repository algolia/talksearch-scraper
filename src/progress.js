import chalk from 'chalk';
import _ from 'lodash';
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

const Progress = {
  youtube: {
    onCrawlingStart(data) {
      const name = data.config.indexName;
      const total = data.playlists.length;
      newBar(name, 'blue', total);
    },
    onCrawlingEnd(videos) {
      updateCursor();
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
    onPlaylistEnd(data) {
      allBars[data.config.indexName].tick();
    },
  },
  algolia: {
    onBatchStart(data) {
      const progressName = chalk.green(data.uuid);
      const chunkCount = data.chunkCount;
      allBars[data.uuid] = progressBars.newBar(
        `[${progressName}] [:bar] :current/:total`,
        {
          total: chunkCount,
          width: 70,
        }
      );
    },
    onBatchChunk(uuid) {
      allBars[uuid].tick();
    },
    onBatchEnd() {
      updateCursor();
    },
  },
  onError(error, title) {
    console.info(chalk.red(title));
    console.error(error);
  },
  onWarning(title, details) {
    warnings.push({ title, details });
  },
  displayWarnings() {
    updateCursor();
    const groupedWarnings = _.groupBy(warnings, 'title');
    _.each(groupedWarnings, (typedWarnings, title) => {
      console.info(chalk.red(title));

      const displayedResult = _.flatten(_.map(typedWarnings, 'details')).join(
        '\n'
      );

      console.info(chalk.yellow(displayedResult));
    });
  },
  // onPlaylistGetPage(playlistId, pageInfo) {
  //   // First call, we create the progress bar
  //   if (!progressPlaylist) {
  //     console.info(chalk.yellow(`Playlist ${playlistId}`));
  //     createPlaylistProgressBar(pageInfo.max);
  //   }

  //   tickPlaylist(pageInfo.increment);
  // },
  // onPlaylistGetEnd() {
  //   // Move cursor offscreen, it will force to put it at the lowest it can be
  //   process.stdout.cursorTo(0, 10000);

  //   if (errors.length === 0) {
  //     console.info(chalk.bold.green('\n✔ All done'));
  //   }
  // },
  // onVideoDataStart(videoId) {
  //   const id = chalk.green(videoId);
  //   progressVideos[videoId] = progressBars.newBar(`[${id}] :name :details`, {
  //     total: 2,
  //     width: 10,
  //     complete: chalk.green('.'),
  //     incomplete: chalk.grey('.'),
  //   });
  //   displayTokensVideo[videoId] = { name: '???' };
  //   refreshVideo(videoId, {
  //     details: chalk.white('Getting basic informations'),
  //   });
  // },

  // onVideoDataBasic(videoId, data) {
  //   refreshVideo(videoId, { name: chalk.blue(data.snippet.title) });
  // },

  // onVideoCaptionsStart(videoId) {
  //   refreshVideo(videoId, { details: chalk.white('Getting captions') });
  // },

  // onVideoRawStart(videoId) {
  //   refreshVideo(videoId, { details: chalk.white('Getting raw data') });
  // },

  // onVideoDataEnd(videoId, data) {
  //   const captionsCount = data.captions.length;
  //   displayTokens.captions += captionsCount;
  //   if (captionsCount > 0) {
  //     refreshPlaylist();
  //     refreshVideo(videoId, {
  //       details: chalk.green(`✔ Done (${captionsCount} captions)`),
  //     });
  //   }
  // },

  // onVideoError(videoId, errorMessage) {
  //   refreshVideo(videoId, { details: chalk.red(`✘ ${errorMessage}`) });
  // },
};

export default Progress;
