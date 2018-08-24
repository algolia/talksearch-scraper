import _ from 'lodash';
export default {
  indexName: 'voice_summit',
  playlists: [
    'PLn51IO3rbkV1E1a6WjgvFtW3VaOCRxzov', // VOICE Summit 2018: Speakers
  ],
  transformData(rawRecord, helper) {
    const record = rawRecord;

    function capitalizeName(speakerName) {
      return _.map(_.words(speakerName), _.capitalize).join(' ');
    }

    const isPanel = _.startsWith(record.video.title, 'panel');

    // Cleaning title
    helper.trimKey(record, 'video.title', 'keynote', 'panel', 'enterprise-');
    let originalTitle = _.get(record, 'video.title');
    originalTitle = _.trimEnd(originalTitle, '-');

    const split = helper.split(originalTitle, '- ');
    let videoTitle;
    let speakers;

    // Panels
    if (isPanel) {
      videoTitle = _.capitalize(split[0]);
      speakers = _.map(_.split(split[1], ','), speakerName => ({
        name: capitalizeName(speakerName),
      }));
    }

    if (!isPanel) {
      videoTitle = _.map(_.slice(split, 1), _.capitalize).join(' - ');

      speakers = _.map(helper.split(split[0], 'and', ','), speakerName => ({
        name: capitalizeName(speakerName),
      }));
    }

    _.set(record, 'video.title', videoTitle);
    _.set(record, 'speakers', speakers);

    return record;
  },
};
