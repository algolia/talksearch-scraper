import _ from 'lodash';
export default {
  indexName: 'chatbot_summit',
  playlists: [
    'PLTr6zBI1qE6ZJLibC66IsVpfkW9LGC6j_', // 2018
    'PLTr6zBI1qE6YLYSi05CYy3O5qYy_M9oze', // 2017
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Remove conference name from video titles
    record = helper.trimKey(
      record,
      'video.title',
      'The 2nd International Chatbot Summit',
      'Chatbot Summit Tel Aviv 2018',
      'Chatbot Summit Berlin 2017'
    );

    // Remove speaker name from titles
    const speakerNames = _.map(_.get(record, 'speakers'), 'name');
    let videoTitle = _.get(record, 'video.title');
    if (speakerNames.length === 1) {
      _.each(speakerNames, speakerName => {
        videoTitle = _.replace(videoTitle, `${speakerName} //`, '');
        videoTitle = _.replace(videoTitle, `// ${speakerName}`, '');
      });
    }

    // remove other cruft
    videoTitle = _.replace(videoTitle, '|  |', '|');
    videoTitle = _.trim(videoTitle, '/|');
    videoTitle = _.trim(videoTitle);
    _.set(record, 'video.title', videoTitle);

    return record;
  },
};
