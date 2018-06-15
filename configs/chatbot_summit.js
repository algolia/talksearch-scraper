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

    // Set conference year
    record = helper.guessConferenceYear(record);

    // https://www.youtube.com/watch?v=brfnKBatwBo&t=1s
    // Yoav Barel, Founder & CEO Chatbot SummitThe 2nd International Chatbot
    // Summit
    //
    // https://www.youtube.com/watch?v=YS2Ob1TK6jI
    // Eran Vanounou and Adam OrentlicherThe Secrets of Bots at Scale
    //
    // https://www.youtube.com/watch?v=ZR9Ufv5CP2Q&t=1s
    // NO title, should be the title not the author

    // Remove cruft from video titles
    record = helper.trimKey(
      record,
      'video.title',
      'The 2nd International Chatbot Summit',
      'Chatbot Summit Tel Aviv 2018',
      'Chatbot Summit Berlin 2017'
    );

    let videoTitle = _.get(record, 'video.title');
    const parts = helper.split(videoTitle, '//', '|');
    const authorName = _.find(parts, helper.isAuthorName);
    _.remove(parts, part => part === authorName);
    videoTitle = _.join(parts, '');

    _.set(record, 'author.name', authorName);
    _.set(record, 'video.title', videoTitle);

    return record;
  },
};
