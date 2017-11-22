import { getSubtitles } from 'youtube-captions-scraper';
import algoliasearch from 'algoliasearch';

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;
const client = algoliasearch(APP_ID, API_KEY);
const unifiedIndex = client.initIndex('video-captions');
const captionsIndex = client.initIndex('captions');
const videosIndex = client.initIndex('videos');

function indexCaptions(captions, videoId) {
  const captionsWithObjectID = captions.map(caption => ({
    ...caption,
    objectID: `${videoId}-${caption.start}`,
  }));
  captionsIndex.addObjects(captionsWithObjectID);
}

function indexVideo(video) {
  videosIndex.addObject(video);
}

function indexAll(video, captions, videoId) {
  const captionsWithVideoInfo = captions.map(caption => ({
    ...caption,
    video_title: video.title,
    video_description: video.description,
    video_thumbnails: video.thumbnails,
    channel: video.channel,
    objectID: `${videoId}-${caption.start}`,
  }));
  unifiedIndex.addObject(captionsWithVideoInfo);
}

export default async function indexToAlgolia(videos) {
  const report = {
    totalVideos: videos.length,
    indexedVideos: videos.length,
    failures: [],
  };

  for (const video of videos) {
    try {
      let captions = await getSubtitles({
        videoID: video.id,
      });
      // currently there are some font tags in the captions that need to be removed
      var re = new RegExp('<'+'font'+'[^><]*>|<.'+'font'+'[^><]*>','g');
      captions = captions.map(caption => {
        caption.text = caption.text.replace(re, '');
        return caption;
      })
      indexAll(video, captions, video.id)
      indexVideo(video);
      indexCaptions(captions, video.id);

    } catch (err) {
      report.indexedVideos--;
      report.failures.push(video.id);
    }
  }

  return report;
}
