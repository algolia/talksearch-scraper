import _ from 'lodash';
import dayjs from 'dayjs';
import nodeObjectHash from 'node-object-hash';
import { mapPairSlide } from './utils';

/**
 * Compute a value for ranking based on the various popularity metrics.
 * So far, it's an easy sum of all interactions (like/dislike/views/comments,
 * etc).
 * @param {Object} videoData Object of all interactions
 * @return {Number} Popularity score
 **/
function getPopularityScore(videoData) {
  if (!_.has(videoData, 'popularity')) {
    return 0;
  }
  return _.sum(_.values(_.get(videoData, 'popularity')));
}

/**
 * Return an object representation of the date, with timestamp values capped at
 * the start of the day, month and year. This will be used to limit ties in the
 * custom ranking
 * @param {Number} timestamp The exact timestamp
 * @returns {Object} An object of capped timestamps
 **/
function getBucketedDate(timestamp) {
  const date = dayjs(timestamp * 1000);
  const yearGranularity = date.startOf('year');
  const monthGranularity = date.startOf('month');
  const dayGranularity = date.startOf('day');

  return {
    year: yearGranularity.unix(),
    month: monthGranularity.unix(),
    day: dayGranularity.unix(),
    timestamp: date.unix(),
  };
}

const Transformer = {
  config: {},

  init(argv) {
    this.config = require(`../configs/${argv.config}.js`);
  },

  run(videos) {
    let records = [];
    _.each(videos, video => {
      records = _.concat(records, this.recordsFromVideo(video));
    });

    return records;
  },

  recordsFromVideo(video) {
    const hashObject = nodeObjectHash().hash;

    const videoData = { ...video.video };
    _.set(videoData, 'popularity.score', getPopularityScore(videoData));
    _.set(videoData, 'publishedDate', getBucketedDate(videoData.publishedDate));
    let baseRecord = {
      video: videoData,
      playlist: video.playlist,
      channel: video.channel,
    };
    // Transform the record with custom transformData from the config
    if (_.get(this, 'config.transformData')) {
      baseRecord = this.config.transformData(baseRecord);
    }

    // Group captions two by two, so each record is two lines of captions
    return mapPairSlide(video.captions, (first, second = {}, position) => {
      const content = [first.content, second.content].join(' ');
      const start = first.start;
      const duration = _.round(_.sum([first.duration, second.duration]), 2);

      const record = {
        ...baseRecord,
        caption: {
          content,
          start,
          duration,
          position,
        },
      };

      // Set a unique objectID to identify the record
      record.objectID = hashObject(record);

      return record;
    });
  },

  internals: {
    getPopularityScore,
    getBucketedDate,
  },
};

export default Transformer;
