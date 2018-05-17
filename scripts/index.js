import fileutils from '../src/fileutils';
import youtube from '../src/youtube';
import progress from '../src/progress';
import yargs from 'yargs';

// Progress bar display
youtube.on('playlist:get:page', progress.onPlaylistGetPage);
youtube.on('playlist:get:end', progress.onPlaylistGetEnd);
youtube.on('video:data:start', progress.onVideoDataStart);
youtube.on('video:data:basic', progress.onVideoDataBasic);
youtube.on('video:data:end', progress.onVideoDataEnd);
youtube.on('video:captions:start', progress.onVideoCaptionsStart);
youtube.on('video:raw:start', progress.onVideoRawStart);
youtube.on('video:error', progress.onVideoError);
youtube.on('error', progress.onError);

/**
 * Parsing command line arguments
 **/
const argv = yargs
  .usage('Usage: yarn index [url]')
  .command('$0 <url> [options]', 'Index the videos of the specified url')
  .options({
    'to-cache': {
      describe: 'Save API data to disk instead of pushing to Algolia',
      default: false,
    },
    'from-cache': {
      describe: 'Push records from cache instead of requesting API',
      default: false,
    },
    'log-calls': {
      describe: 'Save HTTP call results to disk',
      default: false,
    },
  })
  .help(false)
  .version(false).argv;

const url = argv.url;
const toCache = argv.toCache;
const fromCache = argv.fromCache;
const logCalls = argv.logCalls;

(async () => {
  youtube.init({ logCalls, fromCache });
  // Getting videos from Youtube
  const videos = await youtube.getVideosFromUrl(url);
  progress.displayErrors();

  // Writing to cache
  if (toCache) {
    const playlistId = videos[0].playlist.id;
    await fileutils.writeJSON(`./cache/${playlistId}.json`, videos);
    return;
  }
})();
