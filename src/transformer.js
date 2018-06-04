import _ from 'lodash';
import dayjs from 'dayjs';
import nodeObjectHash from 'node-object-hash';
let config;

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

function getCaptionDetails(caption, position, videoId) {
  if (caption === undefined) {
    return undefined;
  }

  const content = caption.content;
  const duration = _.round(caption.duration, 2);
  const start = _.floor(caption.start);
  const url = `https://www.youtube.com/watch?v=${videoId}&t=${start}s`;

  return {
    content,
    duration,
    start,
    position,
    url,
  };
}

function recordsFromVideo(video) {
  const hashObject = nodeObjectHash().hash;

  // Enhanced video data
  const videoDetails = { ...video.video };
  _.set(videoDetails, 'popularity.score', getPopularityScore(videoDetails));
  _.set(
    videoDetails,
    'publishedDate',
    getBucketedDate(videoDetails.publishedDate)
  );

  // Base record metadata to add to all records
  let baseRecord = {
    video: videoDetails,
    playlist: video.playlist,
    channel: video.channel,
  };

  // Config specific updates
  if (_.get(config, 'transformData')) {
    baseRecord = config.transformData(baseRecord);
  }

  // One record per caption, with a minimum of 1 even if no captions
  let captions = _.get(video, 'captions');
  if (_.isEmpty(captions)) {
    captions = [undefined];
  }

  return _.map(captions, (caption, position) => {
    const videoId = baseRecord.video.id;
    const captionDetails = getCaptionDetails(caption, position, videoId);
    const record = {
      ...baseRecord,
      caption: captionDetails,
    };

    record.objectID = hashObject(record);
    return record;
  });
}

const Transformer = {
  init(argv) {
    config = require(`../configs/${argv.config}.js`);
  },

  run(videos) {
    let records = [];
    _.each(videos, video => {
      records = _.concat(records, recordsFromVideo(video));
    });

    return records;
  },

  internals: {
    getBucketedDate,
    getPopularityScore,
    getCaptionDetails,
    recordsFromVideo,
  },
};

export default Transformer;
