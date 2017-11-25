import {
  getChannelID,
  getPlaylistID,
  getVideo,
  recursiveGetVideosList,
} from './youtube';

import indexToAlgolia from './algolia';

export async function indexChannel(req, res) {
  console.log('hitting the channel route', req.params.channelName);
  const { params: { channelName } } = req;
  const channelId = await getChannelID(channelName);
  const playlistId = await getPlaylistID(channelId);
  const videos = await recursiveGetVideosList(channelId, playlistId);
  const report = await indexToAlgolia(videos, channelName);
  res.send(report);
}

export async function indexVideo(req, res) {
  console.log('hitting the video route', req.params.videoId);
  const { params: { videoId } } = req;
  const video = await getVideo(videoId);
  const report = await indexToAlgolia(
    [video],
    `${video.channel}-video-${video.id}`
  );
  res.send(report);
}

export async function indexPlaylist(req, res) {
  console.log('hitting the playlist route', req.params.playlistId);
  const { params: { playlistId } } = req;
  const videos = await recursiveGetVideosList(null, playlistId);
  const report = await indexToAlgolia(
    videos,
    `${videos[0].channel}-playlist-${playlistId}`
  );
  res.send(report);
}
