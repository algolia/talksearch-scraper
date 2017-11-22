import { getSubtitles } from 'youtube-captions-scraper';
import { map } from 'lodash';
import { getChannelID, getPlaylistID, recursiveGetVideosList } from './youtube';

export async function indexChannel(req, res) {
  console.log(req.params)
  const { params: { channelName } } = req;
  const channelId = await getChannelID(channelName);
  const playlistId = await getPlaylistID(channelId);

  const uploads = await recursiveGetVideosList(channelId, playlistId);
  console.log(`found ${uploads.length} videos`);

  res.send({ uploads });

  /*const videosWithSubtitles = await getEnglishSubtitles(uploads);
  console.log(`found ${videosWithSubtitles.length} videos with subtitle`);

  res.send({
    nbVideos: uploads.length,
    nbVideosWithSubtitles: videosWithSubtitles.length,
    results: map(videosWithSubtitles, 'id'),
  });

  // index into algolia
  await indexVideos(videosWithSubtitles);
  getSubtitles({
    videoID: 'XXXXX', // youtube video id
    lang: 'fr' // default: `en`
  }).then(captions => {
    console.log(captions);
  });*/
}
