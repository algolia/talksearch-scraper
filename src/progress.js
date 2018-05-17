import chalk from 'chalk';
import _ from 'lodash';
import MultiProgressBar from 'multi-progress';
const progressBars = new MultiProgressBar();

let progressPlaylist = null;
const progressVideos = {};
const displayTokens = { captions: 0 };
const errors = [];

/**
 * Increment playlist progressbar by specified value
 *
 * @param {Number} value Value to increment. Usually the number of elements in
 * one page.
 * @returns {void}
 **/
function tickPlaylist(value) {
  progressPlaylist.tick(value, displayTokens);
}
/**
 * Refresh tge playlist progress bar without incrementing the bar
 *
 * @returns {void}
 **/
function refreshPlaylist() {
  tickPlaylist(0);
}

/**
 * Increment a video progressbar to the next step
 *
 * @param {String} videoId The unique ID of the video
 * @param {String} details The current step processed
 * @returns {void}
 **/
function tickVideo(videoId, details) {
  progressVideos[videoId].tick(1, { details });
}

/**
 * Refresh a video progressbar without going to the next step
 *
 * @param {String} videoId The unique ID of the video
 * @param {String} details The current step processed
 * @returns {void}
 **/
function refreshVideo(videoId, details) {
  progressVideos[videoId].tick(0, { details });
}

/**
 * Create the playlist progress bar
 *
 * @param {Number} max The maximum number of steps
 * @returns {void}
 **/
function createPlaylistProgressBar(max) {
  progressPlaylist = progressBars.newBar(
    `[:bar] Videos: :current/:total Captions: :captions`,
    {
      total: max,
      width: 30,
    }
  );
  refreshPlaylist();
}

const Progress = {
  displayErrors() {
    process.stdout.cursorTo(0, 10000);
    _.each(errors, error => {
      console.info(chalk.red(error.title));
      console.error(error.error);
    });
  },
  onPlaylistGetPage(playlistId, pageInfo) {
    // First call, we create the progress bar
    if (!progressPlaylist) {
      console.info(chalk.yellow(`Playlist ${playlistId}`));
      createPlaylistProgressBar(pageInfo.max);
    }

    tickPlaylist(pageInfo.increment);
  },

  onPlaylistGetEnd() {
    // Move cursor offscreen, it will force to put it at the lowest it can be
    process.stdout.cursorTo(0, 10000);

    if (errors.length === 0) {
      console.info(chalk.bold.green('\n✔ All done'));
    }
  },

  onVideoDataStart(videoId) {
    const name = chalk.green(videoId);
    progressVideos[videoId] = progressBars.newBar(`[${name}] :bar :details`, {
      total: 2,
      width: 10,
      complete: chalk.green('.'),
      incomplete: chalk.grey('.'),
    });
    tickVideo(videoId, 'Getting basic informations');
  },

  onVideoCaptionsStart(videoId) {
    tickVideo(videoId, 'Getting captions');
  },

  onVideoRawStart(videoId) {
    tickVideo(videoId, 'Getting raw data');
  },

  onVideoDataEnd(videoId, data) {
    // const captionsCount = data.captions.length;
    // displayTokens.captions += captionsCount;
    // refreshPlaylist();
    // refreshVideo(videoId, `✔ Done (${captionsCount} captions)`);
  },

  onVideoError(videoId, errorMessage) {
    refreshVideo(videoId, chalk.red(`✘ ${errorMessage}`));
  },

  onError(error, title) {
    errors.push({ error, title });
  },
};

export default Progress;
