import _ from 'lodash';

export default {
  indexName: 'writethedocs',
  playlists: [
    'PLZAeFn6dfHpnHBLE4qEUwg1LjhDZEvC2A', // Write the Docs EU 2014
    'PLZAeFn6dfHplFNTsVdBuHk6vPZbsvHtDw', // Write the Docs Europe 2015
    'PLZAeFn6dfHpnN8fXXHwPtPY33aLGGhYLJ', // Write the Docs Europe 2016
    'PLZAeFn6dfHpkBld-70TsOoYToM3CaTxRC', // Write the Docs Portland 2017
    'PLZAeFn6dfHplBYPCwJt6ItkMDt7JSgUiL', // Write the Docs Prague 2017
    'PLZAeFn6dfHplUgfLOLEuHHAm1HdrIyaZ7', // Write the Docs Portland 2018
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;
    const videoTitle = _.get(record, 'video.title');

    // Get the place and year for the year
    record = helper.enrich(
      record,
      'playlist.title',
      'Write the Docs {conference.year}'
    );

    // Keep lightning talks
    if (videoTitle && videoTitle.match(/lightning talks/i)) {
      return record;
    }

    // Portland 2018
    if (_.get(record, 'conference.year') === 'Portland 2018') {
      record = helper.enrich(
        record,
        'video.title',
        '{video.title} - {_speakers_} - Write the Docs Portland 2018'
      );
      return record;
    }

    // Prague 2017
    if (_.get(record, 'conference.year') === 'Prague 2017') {
      record = helper.enrich(
        record,
        'video.title',
        'Write the Docs Prague 2017: {video.title} by {_speakers_}'
      );
      return record;
    }

    // Portland 2017
    if (_.get(record, 'conference.year') === 'Portland 2017') {
      record = helper.enrich(
        record,
        'video.title',
        'Write the Docs Portland 2017: {video.title} by {_speakers_}'
      );
      return record;
    }

    // Older conferences
    record = helper.enrich(
      record,
      'video.title',
      '{_speakers_} - {video.title}'
    );
    return record;
  },
};
