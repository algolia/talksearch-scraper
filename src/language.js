import pulse from './pulse';
import globals from './globals';
import fileutils from './fileutils';
import diskLogger from './disk-logger';
import language from '@google-cloud/language';
import pMap from 'p-map';
import uuid from 'uuid/v1';
import _ from 'lodash';
let CACHE = {};
let CLIENT;

function client() {
  if (CLIENT) {
    return CLIENT;
  }
  return (CLIENT = new language.LanguageServiceClient());
}

/**
 * Enrich the video with the list of speakers
 * @param {Object} video The original video
 * @returns {Object} The enriched video
 */
async function enrichVideo(video) {
  const speakers = await getSpeakers(video);

  const newVideo = video;
  _.set(newVideo, 'speakers', speakers);

  return newVideo;
}

/**
 * Enrich all videos in the list and return the enriched list
 * @param {Array} videos List of videos
 * @returns {Array} Enriched list of videos
 **/
async function enrichVideos(videos) {
  pulse.emit('enrich:start', { videoCount: videos.length });
  const shouldUseCache = globals.readFromCache();
  if (shouldUseCache) {
    await grabCache();
  }
  const newVideos = await pMap(videos, async video => {
    const newVideo = await enrichVideo(video);
    pulse.emit('enrich:chunk');
    return newVideo;
  });

  if (shouldUseCache) {
    await releaseCache();
  }

  pulse.emit('enrich:end');
  return newVideos;
}

/**
 * Return the list of entities as found by the Google Language API for the given
 * input. Results will be read from cache if cache is enabled
 * @param {String} videoId The videoId (used as a cache key)
 * @param {String} input The sentence to analyze
 * @return {Array} An array of entities
 **/
async function getEntities(videoId, input) {
  const cacheHit = readFromCache(videoId, input);
  if (cacheHit) {
    return cacheHit;
  }

  const options = {
    content: input,
    type: 'PLAIN_TEXT',
  };
  const results = await client().analyzeEntities({ document: options });
  const entities = results[0].entities;

  // Save the API result to disk for debug purposes
  const logPath = `language/${globals.configName()}/${uuid()}.json`;
  const logResults = { input, results };
  diskLogger.write(logPath, logResults);

  // Save to cache as well
  writeToCache(videoId, input, entities);

  return entities;
}

/**
 * Return all the speakers extracted from the video
 * @param {Object} video The video object
 * @return {Array} Array of object containing speaker data
 **/
async function getSpeakers(video) {
  const videoTitle = _.get(video, 'video.title');
  const videoId = _.get(video, 'video.id');
  const entities = await getEntities(videoId, videoTitle);

  let matchingEntities = _.filter(entities, { type: 'PERSON' });
  matchingEntities = _.filter(matchingEntities, entity =>
    _.find(entity.mentions, { type: 'PROPER' })
  );

  return _.map(matchingEntities, speaker => ({ name: speaker.name }));
}

/**
 * Return the internal CACHE.
 * @return {Object} Value of the current cache
 * Each key is a videoID, and each value is an array of objects containing an
 * .input and .entities keys.
 * Note: This is used for tests, to be able to manipulate the private data
 **/
function getCache() {
  return CACHE;
}

/**
 * Set the internal CACHE.
 * @param {Object} newCache The new value of the cache
 * @returns {Void}
 * Note: This is used for tests, to be able to manipulate the private data
 **/
function setCache(newCache) {
  CACHE = newCache;
}

/**
 * Returns the filepath to save the cache to.
 * @return {String} Filepath, relative to the config
 **/
function cacheFilePath() {
  return `./cache/${globals.configName()}/language/cache.json`;
}

/**
 * Read cache file from disk and load it into memory
 * @return {Void}
 **/
async function grabCache() {
  const cacheFile = cacheFilePath();
  const cacheContent = await fileutils.readJson(cacheFile);
  CACHE = cacheContent || {};
}

/**
 * Write the local cache object to disk
 * @return {Void}
 **/
async function releaseCache() {
  const cacheFile = cacheFilePath();
  await fileutils.writeJson(cacheFile, CACHE);
}

/**
 * Read from cache if we already have entities for this videoId and input
 * @param {String} videoId The YouTube videoId
 * @param {String} input The input string to analyze
 * @return {Array|Boolean} false if no result, the array of entities otherwise
 **/
function readFromCache(videoId, input) {
  const shouldUseCache = globals.readFromCache();
  if (!shouldUseCache) {
    return false;
  }

  const cacheVideoEntries = _.get(CACHE, videoId);
  if (!cacheVideoEntries) {
    return false;
  }

  return _.get(_.find(cacheVideoEntries, { input }), 'entities', false);
}

/**
 * Write the entities to the matching input and videoId in the local cache
 * @param {String} videoId The id of the video
 * @param {String} input The string to analyze
 * @param {Array} entities The entities to save
 * @return {Boolean} true if saved, false otherwise
 * Note: This only saves the value in memory, you still need to call
 * releaseCache() to commit it to disk.
 **/
function writeToCache(videoId, input, entities) {
  if (!globals.readFromCache()) {
    return false;
  }

  if (!CACHE[videoId]) {
    CACHE[videoId] = [];
  }

  CACHE[videoId].push({ input, entities });
  return true;
}

const Language = {
  enrichVideos,
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
  internals: {
    grabCache,
    releaseCache,
    readFromCache,
    writeToCache,
    getCache,
    setCache,
    enrichVideo,
    getEntities,
    getSpeakers,
    pulse,
  },
};

export default Language;
