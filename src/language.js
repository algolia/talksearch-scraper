import pulse from './pulse';
import globals from './globals';
import fileutils from './fileutils';
import diskLogger from './disk-logger';
import language from '@google-cloud/language';
import pMap from 'p-map';
import uuid from 'uuid/v1';
import _ from 'lodash';
let CLIENT;

const cache = {
  STORE: {},
  /**
   * Return the internal STORE
   * @return {Object} Value of the current cache
   * Each key is a videoID, and each value is an array of objects containing an
   * .input and .entities keys.
   * Note: This is used for tests, to be able to manipulate the private data
   **/
  get() {
    return this.STORE;
  },

  /**
   * Set the internal STORE
   * @param {Object} newCache The new value of the cache
   * @returns {Void}
   * Note: This is used for tests, to be able to manipulate the private data
   **/
  set(newCache) {
    this.STORE = newCache;
  },

  /**
   * Returns the filepath to save the cache to.
   * @return {String} Filepath, relative to the config
   **/
  filepath() {
    return `./cache/${globals.configName()}/language/cache.json`;
  },

  /**
   * Read cache file from disk and load it into memory
   * @return {Void}
   **/
  async grab() {
    const cacheFile = this.filepath();
    const cacheContent = await fileutils.readJson(cacheFile);
    this.set(cacheContent || {});
  },

  /**
   * Write the local cache object to disk
   * @return {Void}
   **/
  async release() {
    const cacheFile = this.filepath();
    await fileutils.writeJson(cacheFile, this.get());
  },

  /**
   * Read from local cache if we already have entities for this videoId and input
   * @param {String} videoId The YouTube videoId
   * @param {String} input The input string to analyze
   * @return {Array|Boolean} false if no result, the array of entities otherwise
   **/
  read(videoId, input) {
    const shouldUseCache = globals.readFromCache();
    if (!shouldUseCache) {
      return false;
    }

    const cacheVideoEntries = _.get(this.get(), videoId);
    if (!cacheVideoEntries) {
      return false;
    }

    return _.get(_.find(cacheVideoEntries, { input }), 'entities', false);
  },

  /**
   * Write the entities to the matching input and videoId in the local cache
   * @param {String} videoId The id of the video
   * @param {String} input The string to analyze
   * @param {Array} entities The entities to save
   * @return {Boolean} true if saved, false otherwise
   * Note: This only saves the value in memory, you still need to call
   * releaseCache() to commit it to disk.
   **/
  write(videoId, input, entities) {
    if (!globals.readFromCache()) {
      return false;
    }

    const newCache = this.get();

    if (!newCache[videoId]) {
      newCache[videoId] = [];
    }

    newCache[videoId].push({ input, entities });

    this.set(newCache);

    return true;
  },
};

const module = {
  cache: _.bindAll(cache, _.functions(cache)),
  /**
   * Return a singleton instance of the Google Language client
   * @returns {Object} Instance of LanguageServiceClient
   **/
  client() {
    if (CLIENT) {
      return CLIENT;
    }
    return (CLIENT = new language.LanguageServiceClient());
  },

  /**
   * Enrich the video with the list of speakers
   * @param {Object} video The original video
   * @returns {Object} The enriched video
   */
  async enrichVideo(video) {
    const speakers = await this.getSpeakers(video);

    const newVideo = video;
    _.set(newVideo, 'speakers', speakers);

    return newVideo;
  },

  /**
   * Return the list of entities as found by the Google Language API for the given
   * input. Results will be read from cache if cache is enabled
   * @param {String} videoId The videoId (used as a cache key)
   * @param {String} input The sentence to analyze
   * @return {Array} An array of entities
   **/
  async getEntities(videoId, input) {
    const cacheHit = cache.read(videoId, input);
    if (cacheHit) {
      return cacheHit;
    }

    const options = {
      content: input,
      type: 'PLAIN_TEXT',
    };
    const results = await this.client().analyzeEntities({ document: options });
    const entities = results[0].entities;

    // Save the API result to disk for debug purposes
    const logPath = `language/${globals.configName()}/${uuid()}.json`;
    const logResults = { input, results };
    diskLogger.write(logPath, logResults);

    // Save to cache as well
    cache.write(videoId, input, entities);

    return entities;
  },

  /**
   * Return all the speakers extracted from the video
   * @param {Object} video The video object
   * @return {Array} Array of object containing speaker data
   **/
  async getSpeakers(video) {
    const videoTitle = _.get(video, 'video.title');
    const videoId = _.get(video, 'video.id');
    const entities = await this.getEntities(videoId, videoTitle);

    let matchingEntities = _.filter(entities, { type: 'PERSON' });
    matchingEntities = _.filter(matchingEntities, entity =>
      _.find(entity.mentions, { type: 'PROPER' })
    );

    return _.map(matchingEntities, speaker => ({ name: speaker.name }));
  },

  /**
   * Enrich all videos in the list and return the enriched list
   * @param {Array} videos List of videos
   * @returns {Array} Enriched list of videos
   **/
  async enrichVideos(videos) {
    const grabCache = this.cache.grab;
    const enrichVideo = this.enrichVideo;
    const releaseCache = this.cache.release;

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
  },
};

export default _.bindAll(module, _.functions(module));
