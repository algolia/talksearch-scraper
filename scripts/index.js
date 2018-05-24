import youtube from '../src/youtube';
import transformer from '../src/transformer';
import progress from '../src/progress';
import algolia from '../src/algolia';
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

algolia.on('settings:before', () => {
  console.info('Pushing settings');
});
algolia.on('push:before', () => {
  console.info('Pushing records');
});
algolia.on('overwrite:before', () => {
  console.info('Overwriting index');
});
algolia.on('overwrite:after', () => {
  console.info('✔ Done');
});

/**
 * Parsing command line arguments
 **/
const argv = yargs
  .usage('Usage: yarn index [url]')
  .command('$0 config [options]', 'Index the videos of the specified config')
  .options({
    'to-cache': {
      describe: 'Save API data to disk instead of pushing to Algolia',
      default: false,
    },
    'from-cache': {
      describe: 'Push records from cache instead of requesting API',
      default: false,
    },
    log: {
      describe: 'Save HTTP call results to disk',
      default: false,
    },
  })
  .help(false)
  .version(false).argv;

const configName = argv.config;
const toCache = argv.toCache;
const fromCache = argv.fromCache;
const logCalls = argv.log;

(async () => {
  try {
    youtube.init({ logCalls, fromCache, toCache });
    const config = require(`../configs/${configName}.js`);

    // Getting videos from Youtube
    const videos = await youtube.getVideosFromConfig(config);
    progress.displayErrors();

    // Transform videos in records
    const records = transformer.run(videos);

    // Push records
    await algolia.addRecords(records, config);
  } catch (err) {
    console.info(err);
  }
})();
