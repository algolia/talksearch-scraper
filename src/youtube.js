import { forEach, map } from 'p-iteration';
import axios from 'axios';
import dayjs from 'dayjs';
import cheerio from 'cheerio';
import EventEmitter from 'events';
import parseIsoDuration from 'parse-iso-duration';
import qs from 'query-string';
import diskLogger from './disk-logger';
import fileutils from './fileutils';
import _ from 'lodash';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const pulse = new EventEmitter();

let readFromCache = false;
let writeToCache = false;
function init(options) {
  diskLogger.enabled = options.logCalls;
  readFromCache = options.fromCache;
  writeToCache = options.toCache;
}

async function getVideosFromConfig(config) {
  let videos = [];
  await forEach(config.playlists, async playlistId => {
    const playlistVideos = await getVideosFromPlaylist(playlistId);
    videos = _.concat(videos, playlistVideos);
  });

  if (writeToCache) {
    await fileutils.writeJSON(`./cache/${config.indexName}.json`, videos);
  }

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
  // No need to call the API, we're reading it from cache
  if (readFromCache) {
    return fileutils.readJSON(`./cache/${playlistId}.json`);
  }

  try {
    pulse.emit('playlist:get:start', playlistId);
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
      pulse.emit('playlist:get:page', playlistId, {
        max: pageItems.pageInfo.totalResults,
        increment: pageItems.items.length,
      });

      // Base info about videos in playlist
      const baseInfo = pageItems.items.map(video => ({
        video: {
          id: video.contentDetails.videoId,
          positionInPlaylist: video.snippet.position,
        },
        playlist: playlistData,
      }));
      // Advanced info about each video
      const advancedInfo = await getVideoData(_.map(baseInfo, 'video.id'));

      // Merging the two
      const newVideos = _.values(
        _.merge(
          _.keyBy(baseInfo, 'video.id'),
          _.keyBy(advancedInfo, 'video.id')
        )
      );

      // Update the generic list
      videos = videos.concat(newVideos);

      pageToken = pageItems.nextPageToken;
      page++;
    } while (pageToken);

    pulse.emit('playlist:get:end', playlistId, videos);

    return videos;
  } catch (err) {
    pulse.emit('error', err, `getVideosFromPlaylist(${playlistId})`);
    return [];
  }
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
 * Returns details about specific videos
 *
 * @param {String|Array.<String>} userVideoId The id (or array of ids) of the
 * video to get data from
 * @returns {Promise.<Object>} A list of all videos in a playlist
 * TOTEST
 **/
async function getVideoData(userVideoId) {
  try {
    const parts = ['contentDetails', 'snippet', 'statistics', 'status'].join(
      ','
    );
    // Allow for either one or several ids
    let videoIds = userVideoId;
    const onlyOneVideoId = !_.isArray(videoIds);
    if (onlyOneVideoId) {
      videoIds = [videoIds];
    }

    forEach(videoIds, videoId => {
      pulse.emit('video:data:start', videoId);
    });
    const response = await get('videos', {
      id: videoIds.join(','),
      part: parts,
    });
    diskLogger.write(
      `videos/${_.first(videoIds)}-to-${_.last(videoIds)}.json`,
      response
    );

    const videoData = await map(response.items, async data => {
      pulse.emit('video:data:basic', data.id, data);

      const videoId = data.id;
      const captions = await getCaptions(videoId);
      const hasCaptions = captions.length > 0;
      const hasManualCaptions = data.contentDetails.caption === 'true';
      const publishedDate = dayjs(data.snippet.publishedAt).unix();
      const viewCount = _.parseInt(data.statistics.viewCount);
      const likeCount = _.parseInt(data.statistics.likeCount);
      const dislikeCount = _.parseInt(data.statistics.dislikeCount);
      const favoriteCount = _.parseInt(data.statistics.favoriteCount);
      const commentCount = _.parseInt(data.statistics.commentCount);
      const durationInSeconds =
        parseIsoDuration(data.contentDetails.duration) / 1000;
      const duration = {
        minutes: Math.floor(durationInSeconds / 60),
        seconds: durationInSeconds % 60,
      };

      return {
        channel: {
          id: data.snippet.channelId,
          title: data.snippet.channelTitle,
        },
        video: {
          id: videoId,
          title: data.snippet.title,
          description: data.snippet.description,
          publishedDate,
          thumbnails: data.snippet.thumbnails,
          hasCaptions,
          hasManualCaptions,
          language: data.snippet.defaultAudioLanguage,
          popularity: {
            views: viewCount,
            likes: likeCount,
            dislikes: dislikeCount,
            favorites: favoriteCount,
            comments: commentCount,
          },
          duration,
        },
        captions,
      };
    });

    forEach(videoIds, (videoId, index) => {
      pulse.emit('video:data:end', videoId, videoData[index]);
    });

    // Return only data if only one id passed initially
    if (onlyOneVideoId) {
      return videoData[0];
    }
    return videoData;
  } catch (err) {
    pulse.emit('error', err, `getVideoData(${userVideoId})`);
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
    pulse.emit('video:raw:start', videoId);
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
    pulse.emit('video:raw:end', params);
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
      pulse.emit('video:error', videoId, 'No caption url');
      return [];
    }

    pulse.emit('video:captions:start', videoId);
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

    pulse.emit('video:captions:end', videoId, captions);
    if (captions.length === 0) {
      pulse.emit('video:error', videoId, 'No captions found');
    }
    return captions;
  } catch (err) {
    pulse.emit('video:error', videoId, 'Error when getting captions');
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
  getVideosFromConfig,
  // Allow dispatching of events
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
  // We expose those methods so we can test them. But we clearly mark them as
  // being internals, and not part of the public API
  internals: {
    getCaptionsUrl,
    getCaptions,
    getPlaylistData,
    getVideosFromPlaylist,
  },
};

export default Youtube;
