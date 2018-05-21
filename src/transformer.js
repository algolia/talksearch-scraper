import _ from 'lodash';
import { mapPairSlide } from './utils';

const Transformer = {
  run(videos) {
    let records = [];
    _.each(videos, video => {
      records = _.concat(records, this.recordsFromVideo(video));
    });

    return records;
  },

  recordsFromVideo(video) {
    // Group captions two by two, so each record is two lines of captions
    return mapPairSlide(video.captions, (first, second = {}) => {
      const content = [first.content, second.content].join(' ');
      const start = first.start;
      const duration = _.round(_.sum([first.duration, second.duration]), 2);
      return {
        caption: {
          content,
          start,
          duration,
        },
        video: video.video,
        playlist: video.playlist,
        channel: video.channel,
      };
    });
  },
};

export default Transformer;
