import youtube from '../src/youtube';
import transformer from '../src/transformer';
import progress from '../src/progress';
import algolia from '../src/algolia';
import yargs from 'yargs';

// Progress bar display
youtube.on('crawling:start', progress.youtube.onCrawlingStart);
youtube.on('crawling:end', progress.youtube.onCrawlingEnd);
youtube.on('playlist:start', progress.youtube.onPlaylistStart);
youtube.on('playlist:chunk', progress.youtube.onPlaylistChunk);
youtube.on('playlist:end', progress.youtube.onPlaylistEnd);
youtube.on('error', progress.onError);
youtube.on('warning', progress.onWarning);

algolia.on('batch:start', progress.algolia.onBatchStart);
algolia.on('batch:chunk', progress.algolia.onBatchChunk);
algolia.on('batch:end', progress.algolia.onBatchEnd);

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
    logs: {
      describe: 'Save HTTP call results to disk',
      default: false,
    },
  })
  .help(false)
  .version(false).argv;

(async () => {
  try {
    youtube.init(argv);
    algolia.init(argv);
    transformer.init(argv);

    const videos = await youtube.getVideos();
    progress.displayWarnings();

    // Transform videos in records
    const records = transformer.run(videos);

    // Push records
    await algolia.run(records);
  } catch (err) {
    console.info(err);
  }
})();
