import { getSubtitles } from 'youtube-captions-scraper';
import algoliasearch from 'algoliasearch';

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;
const client = algoliasearch(APP_ID, API_KEY);
const globalIndex = client.initIndex('ALL_VIDEOS');

function index(indexName, video, captions) {
  const algoliaIndex = client.initIndex(indexName);
  const captionsWithObjectID = captions.map(caption => ({
    ...caption,
    videoId: video.id,
    videoTitle: video.title,
    videoDescription: video.description,
    videoThumbnails: video.thumbnails,
    videoRanking: video.ranking,
    channel: video.channel,
    objectID: `${video.id}-${caption.start}`,
  }));
  algoliaIndex.setSettings({
    searchableAttributes: ['text'],
    attributesForFaceting: ['videoId'],
  });
  algoliaIndex.addObjects(captionsWithObjectID);
  globalIndex.addObject({
    ...video,
    indexName,
  });
}

export default async function indexToAlgolia(videos, indexName) {
  const report = {
    indexName,
    totalVideos: videos.length,
    failures: [],
  };

  for (const video of videos) {
    try {
      const captions = await getSubtitles({
        videoID: video.id,
      });
      index(indexName, video, captions);
    } catch (err) {
      report.failures.push(video.id);
    }
  }

  report.indexedVideos = report.totalVideos - report.failures.length;

  return report;
}
