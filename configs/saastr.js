/* eslint-disable import/no-commonjs */
import _ from 'lodash';
module.exports = {
  indexName: 'saastr',
  playlists: [
    'PLGlmLTbngJa87gZrq0LohHNQnG_a5t760', // 2018
    'PLGlmLTbngJa9fbcOjinh4FZHVYsizzhdX', // 2017
    'PLGlmLTbngJa-TjQk_B-qAhrjjNu29ydff', // 2016
  ],
  transformData(rawRecord, _helper) {
    const record = rawRecord;

    const playlistTitle = _.get(record, 'playlist.title');
    const conferenceYear = playlistTitle.match(/[0-9]{4}/);

    _.set(record, 'conference.year', _.parseInt(conferenceYear));

    return record;
  },
};
