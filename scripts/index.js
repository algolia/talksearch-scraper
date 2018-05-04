import algolia from '../src/algolia';
import youtube from '../src/youtube';
import MultiProgressBar from 'multi-progress';
import yargs from 'yargs';
import chalk from 'chalk';
const progressBars = new MultiProgressBar();

/**
 * Listening to events and updating progressbars accordingly
 **/
// Main progress bar keeping track of the number of videos downloaded.
// Also keep track of the number of captions through a global variable.
// The only way to update the display is to "tick" it, so we tick with an
// increment of 0 (to not update the progress bar). We also need to pass the
// list of custom token to update (used for keeping track of number of
// captions). This list must be passed in its entirety every time, so we keep it
// in a variable.
let progressPlaylist = null;
const counts = { captions: 0 };
youtube.on('playlist:get:page', (playlistId, pageInfo) => {
  // First call, we create the progress bar
  if (!progressPlaylist) {
    console.yellow(`Playlist ${playlistId}`);
    progressPlaylist = progressBars.newBar(
      `[:bar] Videos: :current/:total Captions: :captions`,
      {
        total: pageInfo.max,
        width: 30,
      }
    );
    progressPlaylist.tick(0, counts);
  }

  // New page page of the playlist
  progressPlaylist.tick(pageInfo.increment, counts);
});
youtube.on('playlist:get:end', () => {
  console.info(chalk.bold.green('\n✔ All done'));
});

// We add one progressbar per video, to see what we're doing on each video.
const videoPlaylists = {};
// We create the progressbar at the start
youtube.on('video:data:start', videoId => {
  const name = chalk.green(videoId);
  videoPlaylists[videoId] = progressBars.newBar(`[${name}] :bar :details`, {
    total: 2,
    width: 10,
    complete: chalk.green('.'),
    incomplete: chalk.grey('.'),
  });
  videoPlaylists[videoId].tick({ details: 'Getting basic information' });
});
// We update the generic count of captions at the end
youtube.on('video:data:end', (videoId, data) => {
  const captionsCount = data.captions.length;
  counts.captions += captionsCount;
  progressPlaylist.tick(0, counts);

  videoPlaylists[videoId].tick(0, {
    details: `✔ Done (${captionsCount} captions)`,
  });
});
// We update the details at each tick
youtube.on('video:captions:start', videoId => {
  videoPlaylists[videoId].tick({ details: 'Getting captions' });
});
youtube.on('video:raw:start', videoId => {
  videoPlaylists[videoId].tick({ details: 'Getting raw data' });
});

/**
 * Parsing command line arguments
 **/
const argv = yargs
  .usage('Usage: yarn index [url]')
  .command('$0 <url> [options]', 'Index the videos of the specified url')
  .options({
    'to-cache': {
      describe: 'Save records to disk instead of pushing to Algolia',
      default: false,
    },
  })
  .help(false)
  .version(false).argv;

const url = argv.url;
const toCache = argv.toCache;

(async () => {
  const videos = await youtube.getVideosFromUrl(url);
  if (toCache) {
    await algolia.writeToCache(videos);
  }
})();
