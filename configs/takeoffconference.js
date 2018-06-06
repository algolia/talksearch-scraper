/* eslint-disable import/no-commonjs */
import _ from 'lodash';
module.exports = {
  indexName: 'takeoffconference',
  playlists: [
    'PLMz7qMiFSV91TlCtopuwEtoMaPhRx96Tg', // 2014
    'PLMz7qMiFSV93QQUFSDRFWPBcdGHfkySqN', // 2013
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    record = helper.enrich(record, 'playlist.title', '{_} {conference.year}');
    _.update(record, 'conference.year', _.parseInt);

    record = helper.enrich(
      record,
      'video.title',
      '{_} - {video.title} - {author.name}'
    );

    return record;
  },
};
