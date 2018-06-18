import youtube from '../src/youtube';
import globals from '../src/globals';
import transformer from '../src/transformer';
import progress from '../src/progress';
import algolia from '../src/algolia';
import yargs from 'yargs';

/**
 * Parsing command line arguments
 **/
const argv = yargs
  .usage('Usage: yarn index [url]')
  .command('$0 config', 'Index the videos of the specified config')
  .help(false)
  .version(false).argv;

(async () => {
  try {
    globals.init(argv.config);

    // Get all video data from YouTube
    const videos = await youtube.getVideos();
    progress.displayWarnings();

    // Transform videos in records
    // const records = await transformer.run(videos);

    // Push records
    // await algolia.run(records);
  } catch (err) {
    console.info(err);
  }
})();
