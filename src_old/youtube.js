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
  }).catch(reason => {
    console.log(reason)
  });
}

function getYear(video) {
  return new Date(video.snippet.publishedAt).getFullYear();
}

function getDuration(video) {
  let duration = 0;
  const videoDuration = video.contentDetails.duration;
  const minutes = videoDuration.replace(/PT(.*)M.*/, '$1');
  if (minutes !== videoDuration) {
    duration += parseInt(minutes, 10) * 60;
  }
  const seconds = videoDuration.replace(/PT(.*M)?(.*)S/, '$2');
  if (seconds !== videoDuration) {
    duration += parseInt(seconds, 10);
  }
  return duration;
}

function getRanking(video) {
  let ranking = 0;
  for (const stat in video.statistics) {
    if (video.statistics.hasOwnProperty(stat)) {
      ranking += parseInt(video.statistics[stat], 10);
    }
  }
  return ranking;
}

function getVideoData(video, id) {
  return {
    id,
    title: video.snippet.title,
    description: video.snippet.description,
    thumbnails: video.snippet.thumbnails.medium,
    channel: video.snippet.channelTitle,
    channelId: video.snippet.channelId,
    tags: video.snippet.tags,
    ranking: getRanking(video),
    duration: getDuration(video),
    year: getYear(video),
  };
}

export function getChannelID(channelName) {
  return ytAPIReq('channels', {
    params: { forUsername: channelName, part: 'id' },
  }).then(get('data.items[0].id'));
}

export function getChannelAvatar(channelId) {
  return ytAPIReq('channels', {
    params: { id: channelId, part: 'snippet' },
  }).then(get('data.items[0].snippet.thumbnails.high.url'));
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
      part: 'snippet,contentDetails,statistics',
    },
  });

  // Skip video that returns with no attributes such as private videos
  if (items[0]) {
    return getVideoData(items[0], items[0].id);
  } else {
    return false;
  }
}

export async function recursiveGetVideosList(
  channelId,
  playlistId,
  pageToken,
  videos = []
) {
  const { data: { nextPageToken, items } } = await ytAPIReq('playlistItems', {
    params: {
      channelId,
      playlistId,
      pageToken,
      order: 'date',
      part: 'snippet',
      maxResults: 50,
    },
  });

  const computedVideos = [];
  for (const playlistItem of items) {
    // We need to call /videos for each videos
    // because we can't get statistics directly on /playlistItems
    computedVideos.push(
      await getVideo(playlistItem.snippet.resourceId.videoId)
    );
  }

  return nextPageToken
    ? recursiveGetVideosList(
        channelId,
        playlistId,
        nextPageToken,
        videos.concat(computedVideos)
      )
    : videos.concat(computedVideos);
}
