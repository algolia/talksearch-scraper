import algolia from '../src/algolia';
import youtube from '../src/youtube';
import yargs from 'yargs';

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
