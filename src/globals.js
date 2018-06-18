let CONFIG = {};
let CONFIG_NAME = null;
let READ_FROM_CACHE = false;
let WRITE_RESPONSE_LOGS = false;
let YOUTUBE_API_KEY = null;

const globals = {
  init(configName) {
    CONFIG_NAME = configName;
    CONFIG = require(`../configs/${configName}.js`);
    READ_FROM_CACHE = process.env.READ_FROM_CACHE;
    WRITE_RESPONSE_LOGS = process.env.WRITE_RESPONSE_LOGS;
    YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
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
};

export default globals;
