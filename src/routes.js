import {
  getChannelID,
  getPlaylistID,
  getVideo,
  recursiveGetVideosList,
} from './youtube';

import indexToAlgolia from './algolia';

export async function indexChannel(req, res) {
  const { params: { channelName } } = req;
  const channelId = await getChannelID(channelName);
  const playlistId = await getPlaylistID(channelId);
  const videos = await recursiveGetVideosList(channelId, playlistId);
  const report = await indexToAlgolia(videos);
  res.send(report);
}

export async function indexVideo(req, res) {
  const { params: { videoId } } = req;
  const video = await getVideo(videoId);
  const report = await indexToAlgolia([video]);
  res.send(report);
}

export async function indexPlaylist(req, res) {
  const { params: { playlistId } } = req;
  const videos = await recursiveGetVideosList(null, playlistId);
  const report = await indexToAlgolia(videos);
  res.send(report);
}
