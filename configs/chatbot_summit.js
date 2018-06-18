/* eslint-disable import/no-commonjs */
import _ from 'lodash';
module.exports = {
  indexName: 'chatbot_summit',
  playlists: [
    'PLTr6zBI1qE6ZJLibC66IsVpfkW9LGC6j_', // 2018
    'PLTr6zBI1qE6YLYSi05CYy3O5qYy_M9oze', // 2017
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Remove cruft from video titles
    record = helper.trimKey(
      record,
      'video.title',
      'The 2nd International Chatbot Summit',
      'Chatbot Summit Tel Aviv 2018',
      'Chatbot Summit Berlin 2017'
    );

    return record;
  },
};
