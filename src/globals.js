let CONFIG = {};
let CONFIG_NAME = null;
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const READ_FROM_CACHE = process.env.READ_FROM_CACHE || false;
const WRITE_RESPONSE_LOGS = process.env.WRITE_RESPONSE_LOGS || false;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const globals = {
  init(configName) {
    CONFIG_NAME = configName;
    CONFIG = import(`../configs/${configName}.js`).default;
  },
  readFromCache() {
    return READ_FROM_CACHE;
  },
  writeResponseLogs() {
    return WRITE_RESPONSE_LOGS;
  },
  config() {
    return CONFIG;
  },
  configName() {
    return CONFIG_NAME;
  },
  youtubeApiKey() {
    return YOUTUBE_API_KEY;
  },
  algoliaAppId() {
    return ALGOLIA_APP_ID;
  },
  algoliaApiKey() {
    return ALGOLIA_API_KEY;
  },
};

export default globals;
