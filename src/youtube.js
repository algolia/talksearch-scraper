import { forEach, map } from 'p-iteration';
import pMap from 'p-map';
import axios from 'axios';
import _glob from 'glob';
import dayjs from 'dayjs';
import cheerio from 'cheerio';
import EventEmitter from 'events';
import parseIsoDuration from 'parse-iso-duration';
import qs from 'query-string';
import diskLogger from './disk-logger';
import fileutils from './fileutils';
import pify from 'pify';
import _ from 'lodash';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const pulse = new EventEmitter();
const glob = pify(_glob);

let config = null;
let runOptions = null;

function init(argv) {
  runOptions = {
    useCache: argv.useCache,
    configName: argv.config,
  };
  config = require(`../configs/${argv.config}.js`);

  diskLogger.enabled = argv.logs;
}

async function getVideos() {
  const playlists = config.playlists;
  // Download YouTube data on disk
  if (!runOptions.useCache) {
    pulse.emit('crawling:start', { config, playlists });

    await forEach(playlists, async playlistId => {
      const videos = await getVideosFromPlaylist(playlistId);

      await fileutils.writeJSON(
        `./cache/${config.indexName}/${playlistId}.json`,
        videos
      );
    });
  }

  // Read YouTube data from disk
  const playlistFiles = await glob(
    `./cache/${config.indexName}/{${playlists.join(',')}}*.json`
  );
  const videos = _.flatten(await map(playlistFiles, fileutils.readJSON));

  pulse.emit('crawling:end', videos);

  return videos;
}

/**
 * Returns a list of all videos from a specific playlist
 *
 * @param {String} playlistId The id of the playlist
 * @returns {Promise.<Array>} A list of all videos in a playlist
 *
 * It can only get up to 50 videos per page in one call. It will browse all
 * pages to get all videos.
 **/
async function getVideosFromPlaylist(playlistId) {
  try {
    const resultsPerPage = 50;

    const playlistData = await getPlaylistData(playlistId);
    let pageToken = null;
    let videos = [];
    let page = 1;
    do {
      // Get list of all videos in the playlist
      const pageItems = await get('playlistItems', {
        playlistId,
        maxResults: resultsPerPage,
        pageToken,
        part: 'snippet,contentDetails',
      });

      diskLogger.write(
        `playlistItems/${playlistId}-page-${page}.json`,
        pageItems
      );
      if (page === 1) {
        pulse.emit('playlist:start', {
          playlistId,
          totalVideoCount: _.get(pageItems, 'pageInfo.totalResults'),
        });
      }

      const pageVideos = await getVideosFromPlaylistPage(pageItems);
      pulse.emit('playlist:chunk', {
        playlistId,
        chunkVideoCount: pageVideos.length,
      });
      videos = _.concat(videos, pageVideos);

      pageToken = pageItems.nextPageToken;
      page++;
    } while (pageToken);

    // Adding playlist information to all videos
    videos = _.map(videos, video => ({
      ...video,
      playlist: playlistData,
    }));

    pulse.emit('playlist:end', { config, videos });

    return videos;
  } catch (err) {
    pulse.emit('error', err, `getVideosFromPlaylist(${playlistId})`);
    return [];
  }
}

/**
 * Given a playlist page, returns the list of videos of this page, along with
 * their details
 * @param {Object} pageResults The playlist page, as returned by the
 *  /playlistItems endpoint
 * @returns {Promise.<Array>} An array of all videos, along with details
 *
 * Note that some videos returned by the playlistItems might be private. In that
 * case, we won't get any additional data for those videos, so we'll remove them
 * from the returned videos.
 **/
async function getVideosFromPlaylistPage(pageResults) {
  // Page results will give us the videoId and matching position in playlist
  const allVideoInfoFromPage = {};
  _.each(pageResults.items, video => {
    const videoId = video.contentDetails.videoId;
    const positionInPlaylist = _.get(video, 'snippet.positionInPlaylist');
    allVideoInfoFromPage[videoId] = {
      video: {
        id: videoId,
        positionInPlaylist,
      },
    };
  });

  // We also need more detailed information about each video
  const videoPageIds = _.keys(allVideoInfoFromPage);
  const videoDetails = await getVideosData(videoPageIds);

  // If we don't have all the details for all video, we issue a warning
  const videoDetailsIds = _.keys(videoDetails);
  if (videoDetailsIds.length !== videoPageIds.length) {
    const excludedIds = _.difference(videoPageIds, videoDetailsIds);
    pulse.emit(
      'warning',
      'Unable to get details for the following videos',
      _.map(excludedIds, id => `https://youtu.be/${id}`)
    );
  }

  // Discarding videos where we don't have any data and merging together
  const selectedVideoInfoFromPage = _.pick(
    allVideoInfoFromPage,
    videoDetailsIds
  );
  const newVideos = _.values(_.merge(videoDetails, selectedVideoInfoFromPage));

  return newVideos;
}

/**
 * Return details about a specific playlist
 *
 * @param {String} playlistId The playlist id
 * @returns {Promise.<Object>} The playlist data
 **/
async function getPlaylistData(playlistId) {
  try {
    const response = await get('playlists', {
      id: playlistId,
      part: 'snippet',
    });
    diskLogger.write(`playlist/${playlistId}.json`, response);

    const playlistData = response.items[0];
    return {
      id: playlistId,
      title: playlistData.snippet.title,
      description: playlistData.snippet.description,
    };
  } catch (err) {
    pulse.emit('error', err, `getPlaylistData(${playlistId})`);
    return {};
  }
}

/**
 * Extract hasCaptions and hasManualCaptions from the data received from the
 * API.
 * @param {Object} data Video data object as received by the API
 * @param {Array} captions The array of captions
 * @return {Object} Object containing boolean keys .hasCaptions and
 * .hasManualCaptions
 **/
function formatCaptions(data, captions) {
  const hasCaptions = captions.length > 0;
  const hasManualCaptions = _.get(data, 'contentDetails.caption') === 'true';
  return { hasCaptions, hasManualCaptions };
}

/**
 * Format the statistics as returned by the API into an object
 * @param {Object} data Video data object as received by the API
 * @return {Object} Object containing .views, .likes, .dislikes, .favorites,
 * .comments counts as numbers
 **/
function formatPopularity(data) {
  const viewCount = _.parseInt(_.get(data, 'statistics.viewCount'));
  const likeCount = _.parseInt(_.get(data, 'statistics.likeCount'));
  const dislikeCount = _.parseInt(_.get(data, 'statistics.dislikeCount'));
  const favoriteCount = _.parseInt(_.get(data, 'statistics.favoriteCount'));
  const commentCount = _.parseInt(_.get(data, 'statistics.commentCount'));
  return {
    views: viewCount,
    likes: likeCount,
    dislikes: dislikeCount,
    favorites: favoriteCount,
    comments: commentCount,
  };
}

/**
 * Format the duration as returned by the API into an object
 * @param {Object} data Video data object as received by the API
 * @return {Object} Object containing a .minutes and .seconds keys
 **/
function formatDuration(data) {
  const durationInSeconds =
    parseIsoDuration(_.get(data, 'contentDetails.duration')) / 1000;
  return {
    minutes: Math.floor(durationInSeconds / 60),
    seconds: durationInSeconds % 60,
  };
}

function formatChannel(data) {
  return {
    id: _.get(data, 'snippet.channelId'),
    title: _.get(data, 'snippet.channelTitle'),
  };
}

function formatVideo(data, captions) {
  const videoId = data.id;
  const captionsMetadata = formatCaptions(data, captions);
  const popularity = formatPopularity(data);
  const duration = formatDuration(data);
  const publishedDate = dayjs(_.get(data, 'snippet.publishedAt')).unix();

  return {
    id: videoId,
    title: _.get(data, 'snippet.title'),
    description: _.get(data, 'snippet.description'),
    thumbnails: _.get(data, 'snippet.thumbnails'),
    language: _.get(data, 'snippet.defaultAudioLanguage'),
    publishedDate,
    popularity,
    duration,
    ...captionsMetadata,
  };
}

/**
 * Returns details about specific videos
 *
 * @param {Array.<String>} userVideoId The array of ids of the
 * video to get data from
 * @returns {Promise.<Object>} An object where each key is a video id and each
 * value its detailed information
 **/
async function getVideosData(userVideoId) {
  try {
    const parts = ['contentDetails', 'snippet', 'statistics', 'status'].join(
      ','
    );
    let videoIds = userVideoId;
    if (!_.isArray(videoIds)) {
      videoIds = [videoIds];
    }

    const response = await get('videos', {
      id: videoIds.join(','),
      part: parts,
    });
    diskLogger.write(
      `videos/${_.first(videoIds)}-to-${_.last(videoIds)}.json`,
      response
    );

    const items = _.get(response, 'items', []);
    const videoData = {};
    await pMap(items, async data => {
      const videoId = data.id;
      const captions = await getCaptions(videoId);

      const channelMetadata = formatChannel(data);
      const videoMetadata = formatVideo(data, captions);

      videoData[videoId] = {
        channel: channelMetadata,
        video: videoMetadata,
        captions,
      };
    });

    return videoData;
  } catch (err) {
    pulse.emit('error', err, `getVideosData(${userVideoId})`);
    return {};
  }
}

/**
 * Get raw information about a YouTube video.
 *
 * @param {String} videoId Id of the video
 * @returns {Object} Raw data about the video
 *
 * Note: This call does not use the API,but a rather obscure, undocumented,
 * endpoint. The data returned itself is in a variety of formats that has to be
 * parsed to make a cohesive object.
 * TOTEST
 **/
async function getRawVideoInfo(videoId) {
  try {
    /* eslint-disable camelcase */
    const options = {
      url: 'http://www.youtube.com/get_video_info',
      params: {
        video_id: videoId,
      },
    };

    const results = await axios(options);
    diskLogger.write(`get_video_info/${videoId}.txt`, results.data);

    const params = qs.parse(results.data);
    params.adaptive_fmts = qs.parse(params.adaptive_fmts);
    params.atc = qs.parse(params.atc);
    params.fflags = qs.parse(params.fflags);
    params.player_response = JSON.parse(params.player_response);
    params.url_encoded_fmt_stream_map = qs.parse(
      params.url_encoded_fmt_stream_map
    );
    diskLogger.write(`get_video_info/${videoId}.json`, params);
    return params;
  } catch (err) {
    pulse.emit('error', err, `getRawVideoInfo/${videoId}`);
    return {};
  }
  /* eslint-enable camelcase */
}

/**
 * Get the caption url for a given videoId
 *
 * @param {String} videoId Id of the video
 * @returns {String} Url to get the video caption file
 **/
async function getCaptionsUrl(videoId) {
  try {
    const rawData = await getRawVideoInfo(videoId);
    const captionList = _.get(
      rawData,
      'player_response.captions.playerCaptionsTracklistRenderer.captionTracks'
    );
    return _.get(_.find(captionList, { languageCode: 'en' }), 'baseUrl');
  } catch (err) {
    pulse.emit('error', err, `getCaptionsUrl(${videoId})`);
    return false;
  }
}

/**
 * Get captions for a given videoId
 *
 * @param {String} videoId Id of the video
 * @returns {Array} Array of captions
 **/
async function getCaptions(videoId) {
  try {
    const captionUrl = await getCaptionsUrl(videoId);
    if (!captionUrl) {
      return [];
    }

    const xml = await axios.get(captionUrl);
    diskLogger.write(`captions/${videoId}.xml`, xml.data);

    const $ = cheerio.load(xml.data, { xmlMode: true });
    const texts = $('text');
    const captions = _.map(texts, node => {
      const $node = $(node);
      const content = cheerio.load($node.text()).text();
      const start = _.round(parseFloat($node.attr('start')), 2);
      const duration = _.round(parseFloat($node.attr('dur')), 2);
      return {
        content,
        start,
        duration,
      };
    });

    return captions;
  } catch (err) {
    pulse.emit('error', err, `getCaptions(${videoId})`);
    return [];
  }
}

/**
 * Call a Youtube API endpoint with GET parameters
 *
 * @param {String} endpoint The /endpoint to call
 * @param {Object} params The parameters to pass
 * @returns {Promise.<Object>} The data returned by the call
 **/
async function get(endpoint, params) {
  try {
    const options = {
      baseURL: 'https://www.googleapis.com/youtube/v3',
      url: endpoint,
      params: {
        key: YOUTUBE_API_KEY,
        ...params,
      },
    };
    const results = await axios(options);
    return results.data;
  } catch (err) {
    pulse.emit('error', err, `get/${endpoint}/${JSON.stringify(params)}`);
    return {};
  }
}

const Youtube = {
  // Public methods
  init,
  getVideos,
  // Allow dispatching of events
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
  // We expose those methods so we can test them. But we clearly mark them as
  // being internals, and not part of the public API
  internals: {
    pulse,
    formatCaptions,
    formatPopularity,
    formatDuration,
    formatChannel,
    formatVideo,
    getCaptionsUrl,
    getCaptions,
    getPlaylistData,
    getVideosData,
    getVideosFromPlaylistPage,
    getVideosFromPlaylist,
  },
};

export default Youtube;
