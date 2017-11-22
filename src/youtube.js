import { get } from 'lodash/fp';
import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3/';

function ytAPIReq(endpoint, options) {
  return axios({
    ...options,
    url: `${BASE_URL}${endpoint}`,
    params: {
      ...(options.params || {}),
      key: API_KEY,
    },
  });
}

function getVideoData(video, id) {
  return {
    id,
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnails: video.snippet.thumbnails.medium,
    channel: video.snippet.channelTitle,
  };
}

export function getChannelID(channelName) {
  return ytAPIReq('channels', {
    params: { forUsername: channelName, part: 'id' },
  }).then(get('data.items[0].id'));
}

export function getPlaylistID(channelId) {
  return ytAPIReq('channels', {
    params: { id: channelId, part: 'contentDetails' },
  }).then(get('data.items[0].contentDetails.relatedPlaylists.uploads'));
}

export async function getVideo(videoId) {
  const { data: { items } } = await ytAPIReq('videos', {
    params: {
      id: videoId,
      part: 'snippet',
    },
  });
  return getVideoData(items[0], items[0].id);
}

export async function recursiveGetVideosList(
  channelId,
  playlistId,
  pageToken,
  videos = []
) {
  const { data: { nextPageToken1, items } } = await ytAPIReq('playlistItems', {
    params: {
      channelId,
      playlistId,
      pageToken,
      order: 'date',
      part: 'snippet',
      maxResults: 20,
    },
  });

  const computedVideos = items.map(video =>
    getVideoData(video, video.snippet.resourceId.videoId)
  );

  return nextPageToken1
    ? recursiveGetVideosList(
        channelId,
        playlistId,
        nextPageToken1,
        videos.concat(computedVideos)
      )
    : videos.concat(computedVideos);
}
