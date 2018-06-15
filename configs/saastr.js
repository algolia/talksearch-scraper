/* eslint-disable import/no-commonjs */
import _ from 'lodash';
module.exports = {
  indexName: 'saastr',
  playlists: [
    'PLGlmLTbngJa87gZrq0LohHNQnG_a5t760', // 2018
    'PLGlmLTbngJa9fbcOjinh4FZHVYsizzhdX', // 2017
    'PLGlmLTbngJa-TjQk_B-qAhrjjNu29ydff', // 2016
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;
    record = helper.guessConferenceYear(record);


    return record;
  },
};
