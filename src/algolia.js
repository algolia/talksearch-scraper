import { getSubtitles } from 'youtube-captions-scraper';
import algoliasearch from 'algoliasearch';

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;
const client = algoliasearch(APP_ID, API_KEY);
const globalIndex = client.initIndex('ALL_VIDEOS');
const reportIndex = client.initIndex('REPORTS');

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

  globalIndex.search({ query: video.title }, (err, content) => {
    if (err) {
      console.err(err);
      return;
    }
    if (
      content.hits.length === 0 ||
      (content.hits[0].title !== video.title &&
        content.hits[0].channel !== video.channel)
    ) {
      globalIndex.addObject({
        ...video,
        indexName,
      });
    }
  });
}

async function checkDuplicateIndex(indexName) {
  // If channel/playlist/video index already exists, copy the existing index
  const content = await reportIndex.search(indexName);
  if (content.hits.length > 0 && content.hits[0].indexName === indexName) {
    return {
      finalIndexName: `${indexName}-${Date.now()}`,
      existingReport: content.hits[0],
    };
  }
  return { finalIndexName: indexName, existingReport: null };
}

export default async function indexToAlgolia(videos, indexName) {
  const { finalIndexName, existingReport } = await checkDuplicateIndex(
    indexName
  );

  if (existingReport) {
    client.copyIndex(indexName, finalIndexName, (err, content) => {
      if (err) {
        console.error(err);
      }
    });
    delete existingReport._highlightResult;
    return existingReport;
  } else {
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
    reportIndex.addObject(report);
    return report;
  }
}
