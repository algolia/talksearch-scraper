import _ from 'lodash';
import dayjs from 'dayjs';
import { mapPairSlide } from './utils';

// TODO: Documentation
function getPopularityScore(videoData) {
  if (!_.has(videoData, 'popularity')) {
    return 0;
  }
  return _.sum(_.values(_.get(videoData, 'popularity')));
}

// TODO: Documentation
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
  run(videos) {
    let records = [];
    _.each(videos, video => {
      records = _.concat(records, this.recordsFromVideo(video));
    });

    return records;
  },

  // TODO: Documentation
  // TODO: Test score and publishedDate added
  recordsFromVideo(video) {
    // Group captions two by two, so each record is two lines of captions
    return mapPairSlide(video.captions, (first, second = {}) => {
      const content = [first.content, second.content].join(' ');
      const start = first.start;
      const duration = _.round(_.sum([first.duration, second.duration]), 2);

      const videoData = { ...video.video };
      _.set(videoData, 'popularity.score', getPopularityScore(videoData));
      _.set(
        videoData,
        'publishedDate',
        getBucketedDate(videoData.publishedDate)
      );

      return {
        caption: {
          content,
          start,
          duration,
        },
        video: videoData,
        playlist: video.playlist,
        channel: video.channel,
      };
    });
  },

  internals: {
    getPopularityScore,
    getBucketedDate,
  },
};

export default Transformer;
