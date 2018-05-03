import axios from 'axios';
import urlParser from 'url';
import qs from 'query-string';
import _ from 'lodash';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

function parseUrl(inputUrl) {
  const params = qs.parse(urlParser.parse(inputUrl).query);
  return {
    ...(params.list ? { playlistId: params.list } : {}),
    ...(params.v ? { videoId: params.v } : {}),
  };
}

async function getVideosFromUrl(inputUrl) {
  const urlData = parseUrl(inputUrl);
  if (urlData.playlistId) {
    const videos = await getVideosFromPlaylist(urlData.playlistId);
    return videos;
  }

  return [];
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

/**
 * Returns a list of all videos from a specific playlist
 *
 * @param {String} playlistId The id of the playlist
 * @returns {Promise.<Object>} A list of all videos in a playlist
 *
 * It can only get up to 50 videos per page in one call. It will browse all
 * pages to get all videos.
 **/
async function getVideosFromPlaylist(playlistId) {
  const resultsPerPage = 5;

  let pageToken = null;
  let videos = [];
  do {
    // Get list of all videos in the playlist
    const pageItems = await get('playlistItems', {
      playlistId,
      maxResults: resultsPerPage,
      pageToken,
      part: 'snippet,contentDetails',
    });

    let pageVideos = pageItems.items.map(video => ({
      videoId: video.contentDetails.videoId,
      playlistId: video.snippet.playlistId,
      positionInPlaylist: video.snippet.position,
    }));

    // Grab more informations about each video and add it to the existing list
    const videoData = await getVideoData(_.map(pageVideos, 'videoId'));
    pageVideos = pageVideos.map(video => ({
      ...video,
      ..._.find(videoData, { videoId: video.videoId }),
    }));

    // Update the generic list
    videos = videos.concat(pageVideos);

    pageToken = pageItems.nextPageToken;
  } while (pageToken);

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
  videoIds = videoIds.join(',');

  const response = await get('videos', {
    id: videoIds,
    part: parts,
  });

  const videoData = response.items.map(data => {
    const hasCaptions = data.contentDetails.caption === 'true';
    const viewCount = _.parseInt(data.statistics.viewCount);
    const likeCount = _.parseInt(data.statistics.likeCount);
    const dislikeCount = _.parseInt(data.statistics.dislikeCount);
    const favoriteCount = _.parseInt(data.statistics.favoriteCount);
    const commentCount = _.parseInt(data.statistics.commentCount);

    return {
      videoId: data.id,
      publishedDate: data.snippet.publishedAt,
      channelId: data.snippet.channelId,
      channelTitle: data.snippet.channelTitle,
      title: data.snippet.title,
      description: data.snippet.description,
      thumbnails: data.snippet.thumbnails,

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

  // Return only data if only one id passed initially
  if (onlyOneVideoId) {
    return videoData[0];
  }
  return videoData;
}

function errorHandler(response) {
  /* eslint-disable no-console */
  console.error(response.response.data.error);
  /* eslint-enable no-console */
  return undefined;
}

export { getVideosFromUrl, getVideosFromPlaylist, getVideoData };
export default { getVideosFromUrl, getVideosFromPlaylist, getVideoData };
