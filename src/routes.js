import {
  getChannelID,
  getChannelAvatar,
  getPlaylistID,
  getVideo,
  recursiveGetVideosList,
} from './youtube';

import { indexVideos, indexMetadata } from './algolia';

async function getYoutubeChannel(channelId) {
  const playlistId = await getPlaylistID(channelId);
  const videos = await recursiveGetVideosList(channelId, playlistId);
  return { videos, indexName: videos[0].channel };
}

async function getYoutubeVideo(videoId) {
  const video = await getVideo(videoId);
  return {
    videos: [video],
    indexName: `${video.channel}-video-${video.id}`,
  };
}

async function getYoutubePlaylist(playlistId) {
  const videos = await recursiveGetVideosList(null, playlistId);
  return {
    videos,
    indexName: `${videos[0].channel}-playlist-${playlistId}`,
  };
}

function validURL(url) {
  return url.match(/youtube\.com/) !== null;
}

async function recognizeURL(url) {
  let func;
  let id;
  if (url.match(/\?v=/)) {
    func = 'Video';
    id = url.replace(/.*v=([^&]+).*/, '$1');
  } else if (url.match(/\?list=/)) {
    func = 'Playlist';
    id = url.replace(/.*list=([^&]+).*/, '$1');
  } else if (url.match(/channel/)) {
    func = 'Channel';
    id = url.replace(/.*channel\/([^/]+).*/, '$1');
  } else if (url.match(/user/)) {
    func = 'Channel';
    const channelName = url.replace(/.*user\/([^/]+).*/, '$1');
    id = await getChannelID(channelName);
  }

  if (!id) {
    return { func: 'None' };
  }

  return { func, id };
}

function extract(video, regexObj) {
  return video.title.replace(
    new RegExp(regexObj.regex),
    `$${regexObj.nbSubStr}`
  );
}

function extractSpeakerAndTitle(videos, speaker, title) {
  for (const video of videos) {
    if (speaker.extract) {
      if (speaker.regex) {
        video.speaker = extract(video, speaker);
      } else {
        video.speaker = video.title.split(' - ')[1];
      }
    }
    if (title.extract && title.regex) {
      video.title = extract(video, title);
    }
  }
}

export async function index(req, res) {
  const { body: { youtubeURL, speaker, title, name, accentColor } } = req;

  if (!validURL(youtubeURL)) {
    return res.send({
      success: false,
      message: 'The URL is not a valid YouTube URL.',
    });
  }

  const data = await recognizeURL(youtubeURL);
  if (data.func === 'None') {
    return res.send({
      success: false,
      message: 'The URL does not match a YouTube channel, playlist nor video.',
    });
  }

  // Call getYoutube<Channel|Playlist|Video>
  const { videos, indexName } = await eval(
    `getYoutube${data.func}('${data.id}')`
  );

  extractSpeakerAndTitle(videos, speaker);

  const metadata = {
    objectID: indexName,
    youtubeURL,
    name,
    speaker,
    title,
    avatar: await getChannelAvatar(videos[0].channelId),
  };
  if (accentColor) {
    metadata.accentColor = accentColor;
  }
  indexMetadata(metadata);

  const report = await indexVideos(videos, indexName);
  return res.send({
    success: true,
    ...report,
  });
}
