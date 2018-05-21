import EventEmitter from 'events';
import algoliasearch from 'algoliasearch';
const ALGOLIA_API_KEY = process.env.ALGOLIA_API_KEY;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const pulse = new EventEmitter();

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

async function addRecords(records) {
  const sample = records[0];
  const indexName = `${sample.channel.title}_${sample.channel.id}`;
  const indexNameTmp = `${indexName}_tmp`;

  const settings = {
    searchableAttributes: [
      'video.title',
      'playlist.title',
      'unordered(caption.content)',
      'unordered(video.description)',
      'unordered(playlist.description)',
      'unordered(channel.title)',
    ],
    customRanking: [
      'desc(video.hasCaptions)',
      'desc(video.popularity.score)',
      'desc(video.hasManualCaptions)',
      'desc(video.publishedDate.day)',
      'desc(video.duration.minutes)',
      'asc(video.positionInPlaylist)',
      'asc(caption.start)',
    ],
    attributesForFaceting: [
      'video.language',
      'video.hasManualCaptions',
      'video.id',
      'playlist.id',
      'playlist.title',
      'channel.id',
      'channel.title',
    ],
    distinct: true,
    attributeForDistinct: 'video.id',
  };

  // Create temporary index
  const indexTmp = client.initIndex(indexNameTmp);
  pulse.emit('settings:before');
  await indexTmp.setSettings(settings);
  pulse.emit('settings:after');

  // Push to temp
  pulse.emit('push:before');
  await indexTmp.addObjects(records);
  pulse.emit('push:after');

  // Overwrite production
  pulse.emit('overwrite:before');
  await client.moveIndex(indexNameTmp, indexName);
  pulse.emit('overwrite:after');
}

const Algolia = {
  addRecords,
  on(eventName, callback) {
    pulse.on(eventName, callback);
  },
};

export default Algolia;
