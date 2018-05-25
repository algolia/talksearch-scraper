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

// algolia.on('remoteObjectIds:start', progress.algolia.onPushBefore);
// algolia.on('push:before', progress.algolia.onPushBefore);
// algolia.on('push:chunk', progress.algolia.onPushChunk);
// algolia.on('settings:before', () => {
//   console.info('Pushing settings');
// });
// algolia.on('overwrite:before', () => {
//   console.info('Overwriting index');
// });
// algolia.on('overwrite:after', () => {
//   console.info('✔ Done');
// });

/**
 * Parsing command line arguments
 **/
const argv = yargs
  .usage('Usage: yarn index [url]')
  .command('$0 config [options]', 'Index the videos of the specified config')
  .options({
    'use-cache': {
      describe: 'Use the existing disk cache instead of requesting YouTube',
      default: false,
    },
    log: {
      describe: 'Save HTTP call results to disk',
      default: false,
    },
  })
  .help(false)
  .version(false).argv;

(async () => {
  try {
    youtube.init(argv);

    const videos = await youtube.getVideos();
    progress.displayErrors();

    // Transform videos in records
    const records = transformer.run(videos);
    console.info(records.length);

    // Push records
    algolia.init(argv);
    await algolia.run(records);
  } catch (err) {
    console.info(err);
  }
})();
