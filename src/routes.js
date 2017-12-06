import {
  getChannelID,
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

function addSpeaker(videos, speaker) {
  for (const video of videos) {
    if (speaker.regex) {
      video.speaker = video.title.replace(
        new RegExp(speaker.regex),
        `$${speaker.nbSubStr}`
      );
    } else {
      video.speaker = video.title.split(' - ')[1];
    }
  }
}

export async function index(req, res) {
  const { body: { youtubeURL, speaker, name, accentColor } } = req;

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
  if (speaker.extract) {
    addSpeaker(videos, speaker);
  }

  const metadata = {
    objectID: indexName,
    youtubeURL,
    name,
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
