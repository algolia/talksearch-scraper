import Promise from 'bluebird';
import axios from 'axios';
import dayjs from 'dayjs';
import cheerio from 'cheerio';
import EventEmitter from 'events';
import qs from 'query-string';
import urlParser from 'url';
import fileutils from './fileutils';
import _ from 'lodash';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const pulse = new EventEmitter();

let logCalls = false;

/**
 * Returns an object containing the potential videoId, playlistId and channelId
 *
 * @param {String} url The url to parse
 * @returns {Object} Object representing the url
 **/
function parseUrl(url) {
  const params = qs.parse(urlParser.parse(url).query);
  return {
    ...(params.list ? { playlistId: params.list } : {}),
    ...(params.v ? { videoId: params.v } : {}),
  };
}

/**
 * Call a Youtube API endpoint with GET parameters
 *
 * @param {String} endpoint The /endpoint to call
 * @param {Object} params The parameters to pass
 * @returns {Promise.<Object>} The data returned by the call
 **/
async function get(endpoint, params) {
  const options = {
    baseURL: 'https://www.googleapis.com/youtube/v3',
    url: endpoint,
    params: {
      key: YOUTUBE_API_KEY,
      ...params,
    },
  };

  try {
    const results = await axios(options);
    return results.data;
  } catch (err) {
    return errorHandler(err);
  }
}

async function logCall(destination, content) {
  if (!logCalls) {
    return false;
  }

  const writeMethod = _.isObject(content)
    ? fileutils.writeJSON
    : fileutils.write;
  const writing = await writeMethod(`./logs/${destination}`, content);
  return writing;
}

/**
 * Returns a list of videos from a Youtube url.
 * Correctly dispatch to channel or playlist
 *
 * @param {String} url The url to follow
 * @param {Object} options Options
 *  - logCalls {Boolean} If set to true, http calls results will be saved on disk
 * @returns {Promise.<Object>} The list of video
 **/
async function getVideosFromUrl(url, options) {
  logCalls = options.logCalls;

  const urlData = parseUrl(url);
  const playlistId = urlData.playlistId;
  if (playlistId) {
    const videos = await getVideosFromPlaylist(playlistId);
    return videos;
  }

  return [];
}

/**
 * Return details about a specific playlist
 *
 * @param {String} playlistId The playlist id
 * @returns {Promise.<Object>} The playlist data
 **/
async function getPlaylistData(playlistId) {
  const response = await get('playlists', {
    id: playlistId,
    part: 'snippet',
  });
  logCall(`playlists/${playlistId}.json`, response);

  const playlistData = response.items[0];
  return {
    id: playlistId,
    title: playlistData.snippet.title,
    description: playlistData.snippet.description,
  };
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
    logCall(`playlistItems/${playlistId}-page-${page}.json`, pageItems);

    pulse.emit('playlist:get:page', playlistId, {
      max: pageItems.pageInfo.totalResults,
      increment: pageItems.items.length,
    });

    let pageVideos = pageItems.items.map(video => ({
      videoId: video.contentDetails.videoId,
      positionInPlaylist: video.snippet.position,
      playlist: playlistData,
    }));

    // Grab more informations about each video and add it to the existing list
    const videoData = await getVideoData(_.map(pageVideos, 'videoId'));
    pageVideos = pageVideos.map(video => {
      const updatedVideo = {
        ...video,
        ..._.find(videoData, { videoId: video.videoId }),
      };

      return updatedVideo;
    });

    // Update the generic list
    videos = videos.concat(pageVideos);

    pageToken = pageItems.nextPageToken;
    page++;
  } while (pageToken);

  pulse.emit('playlist:get:end', playlistId, videos);

  return videos;
}

/**
 * Returns details about specific videos
 *
 * @param {String|Array.<String>} userVideoId The id (or array of ids) of the
 * video to get data from
 * @returns {Promise.<Object>} A list of all videos in a playlist
 **/
async function getVideoData(userVideoId) {
  const parts = ['contentDetails', 'snippet', 'statistics', 'status'].join(',');
  // Allow for either one or several ids
  let videoIds = userVideoId;
  const onlyOneVideoId = !_.isArray(videoIds);
  if (onlyOneVideoId) {
    videoIds = [videoIds];
  }

  videoIds.forEach(videoId => {
    pulse.emit('video:data:start', videoId);
  });
  const response = await get('videos', {
    id: videoIds.join(','),
    part: parts,
  });
  logCall(`videos/${_.first(videoIds)}-to-${_.last(videoIds)}.json`, response);

  const videoData = await Promise.map(response.items, async data => {
    const videoId = data.id;
    const videoTitle = data.snippet.title;
    const hasCaptions = data.contentDetails.caption === 'true';
    const publishedDate = dayjs(data.snippet.publishedAt).unix();
    const viewCount = _.parseInt(data.statistics.viewCount);
    const likeCount = _.parseInt(data.statistics.likeCount);
    const dislikeCount = _.parseInt(data.statistics.dislikeCount);
    const favoriteCount = _.parseInt(data.statistics.favoriteCount);
    const commentCount = _.parseInt(data.statistics.commentCount);

    let captions;
    try {
      captions = await getCaptions(videoId);
    } catch (err) {
      pulse.emit('video:error', videoId, 'No captions found');
      return {};
    }

    return {
      videoId,
      publishedDate,
      title: videoTitle,
      description: data.snippet.description,
      thumbnails: data.snippet.thumbnails,
      channel: {
        id: data.snippet.channelId,
        title: data.snippet.channelTitle,
      },
      captions,

      defaultLanguage: data.snippet.defaultAudioLanguage,
      hasCaptions,
      licenseType: data.status.license,
      isEmbeddable: data.status.embeddable,

      ranking: {
        views: viewCount,
        likes: likeCount,
        dislikes: dislikeCount,
        favorites: favoriteCount,
        comments: commentCount,
      },
    };
  });

  videoIds.forEach((videoId, index) => {
    pulse.emit('video:data:end', videoId, videoData[index]);
  });

  // Return only data if only one id passed initially
  if (onlyOneVideoId) {
    return videoData[0];
  }
  return videoData;
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
 **/
async function getRawVideoInfo(videoId) {
  pulse.emit('video:raw:start', videoId);
  /* eslint-disable camelcase */
  const options = {
    url: 'http://www.youtube.com/get_video_info',
    params: {
      video_id: videoId,
    },
  };

  try {
    const results = await axios(options);
    logCall(`get_video_info/${videoId}.txt`, results.data);

    const params = qs.parse(results.data);
    params.adaptive_fmts = qs.parse(params.adaptive_fmts);
    params.atc = qs.parse(params.atc);
    params.fflags = qs.parse(params.fflags);
    params.player_response = JSON.parse(params.player_response);
    params.url_encoded_fmt_stream_map = qs.parse(
      params.url_encoded_fmt_stream_map
    );
    pulse.emit('video:raw:end', params);
    return params;
  } catch (err) {
    return errorHandler(err);
  }
  /* eslint-enable camelcase */
}

async function getCaptions(videoId) {
  const rawData = await getRawVideoInfo(videoId);
  const captionList = _.get(
    rawData,
    'player_response.captions.playerCaptionsTracklistRenderer.captionTracks'
  );
  const captionUrl = _.find(captionList, { languageCode: 'en' }).baseUrl;

  pulse.emit('video:captions:start', videoId);
  const xml = await axios.get(captionUrl);
  logCall(`captions/${videoId}.xml`, xml.data);

  const $ = cheerio.load(xml.data, { xmlMode: true });
  const texts = $('text');
  const captions = _.map(texts, node => {
    const $node = $(node);
    const content = cheerio.load($node.text()).text();
    const start = $node.attr('start');
    const duration = $node.attr('dur');
    return {
      content,
      start,
      duration,
    };
  });

  pulse.emit('video:captions:end', videoId, captions);
  return captions;
}

function errorHandler(response) {
  /* eslint-disable no-console */
  console.info(response);
  console.error(response.response.data.error);
  /* eslint-enable no-console */
  return undefined;
}

const Youtube = {
  getVideosFromUrl,
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
};

export default Youtube;
