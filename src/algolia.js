import { getSubtitles } from 'youtube-captions-scraper';
import algoliasearch from 'algoliasearch';

const APP_ID = process.env.APP_ID;
const API_KEY = process.env.API_KEY;
const client = algoliasearch(APP_ID, API_KEY);
const globalIndex = client.initIndex('ALL_VIDEOS');
const reportIndex = client.initIndex('REPORTS');
const metadataIndex = client.initIndex('METADATA');

function setSettings(newIndex) {
  const replicaIndexName = `${newIndex.indexName}-detail`;
  newIndex.setSettings(
    {
      searchableAttributes: [
        'unordered(title)',
        'unordered(description)',
        'unordered(speaker)',
        'unordered(text)',
      ],
      attributesForFaceting: ['id', 'speaker', 'year', 'searchable(tags)'],
      attributeForDistinct: 'id',
      customRanking: ['asc(start)', 'desc(ranking)'],
      replicas: [replicaIndexName],
    },
    err => {
      if (err) {
        console.error(err);
        return;
      }
      const replicaIndex = client.initIndex(replicaIndexName);
      replicaIndex.setSettings({
        searchableAttributes: ['unordered(text)'],
        attributesForFaceting: ['id'],
        attributeForDistinct: 'id',
        customRanking: ['asc(start)'],
      });
    }
  );
}

function addVideoToGlobalIndex(indexName, video) {
  globalIndex.search({ query: video.title }, (err, content) => {
    if (err) {
      console.error(err);
      return;
    }
    if (content.hits.length === 0 || content.hits[0].id !== video.id) {
      globalIndex.addObject({
        ...video,
        indexName,
      });
    }
  });
}

function index(indexName, video, captions) {
  const algoliaIndex = client.initIndex(indexName);
  const captionsWithObjectID = captions.map(caption => {
    delete caption.dur;
    return {
      ...caption,
      start: parseFloat(caption.start),
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnails: video.thumbnails,
      ranking: video.ranking,
      channel: video.channel,
      speaker: video.speaker,
      year: video.year,
      duration: video.duration,
      tags: video.tags,
      objectID: `${video.id}-${caption.start}`,
    };
  });

  setSettings(algoliaIndex);

  algoliaIndex.addObjects(captionsWithObjectID);

  addVideoToGlobalIndex(indexName, video);
}

async function checkDuplicateIndex(indexName) {
  reportIndex.clearCache();

  // If switch of duplication is selected, skip this check

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

export function indexMetadata(metadata) {
  metadataIndex.addObject(metadata);
}

async function getIndexingReport(videos, indexName, lang) {
  const report = {
    indexName,
    totalVideos: videos.length,
    failures: [],
  };

  const languages = lang.split(',');
  for (const video of videos) {
    for (let i = 0; i < languages.length; ++i) {
      try {
        const captions = await getSubtitles({
          videoID: video.id,
          lang: languages[i],
        });
        index(indexName, video, captions);
        break;
      } catch (err) {
        if (i === languages.length - 1) {
          const fakeCaptions = [
            {
              start: 0,
              text: '',
              objectID: `${video.id}-0`,
            },
          ];
          index(indexName, video, fakeCaptions);
          report.failures.push(video.id);
        }
      }
    }
  }

  return report;
}

export async function indexVideos(videos, indexName, lang, checkForDuplicates) {

  if (checkForDuplicates) {
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
      delete existingReport.objectID;
      existingReport.indexName = finalIndexName;
      return existingReport;
    } else {
      const report = await getIndexingReport(videos, indexName, lang);
      report.indexedVideos = report.totalVideos - report.failures.length;
      if (report.indexedVideos > 0) {
        reportIndex.addObject(report);
      }
      return report;
    }
  } else {
    const existingReport = null;
    const finalIndexName = indexName;

    const report = await getIndexingReport(videos, indexName, lang);
    report.indexedVideos = report.totalVideos - report.failures.length;
    if (report.indexedVideos > 0) {
      reportIndex.addObject(report);
    }
    return report;
  }


}
