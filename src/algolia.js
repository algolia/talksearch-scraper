import { getSubtitles } from 'youtube-captions-scraper';
import algoliasearch from 'algoliasearch';

const APP_ID = process.env.ALGOLIA_APP_ID;
const API_KEY = process.env.ALGOLIA_API_KEY;
const client = algoliasearch(APP_ID, API_KEY);
const videosIndex = client.initIndex('videos');
const captionsIndex = client.initIndex('captions');

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

export default async function indexToAlgolia(videos) {
  const report = {
    totalVideos: videos.length,
    indexedVideos: videos.length,
    failures: [],
  };

  for (const video of videos) {
    try {
      const captions = await getSubtitles({
        videoID: video.id,
      });
      indexVideo(video);
      indexCaptions(captions, video.id);
    } catch (err) {
      report.indexedVideos--;
      report.failures.push(video.id);
    }
  }

  return report;
}
