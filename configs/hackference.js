import _ from 'lodash';
export default {
  indexName: 'hackference',
  playlists: [
    'PLJK9M6xgJ-uYeAO4rGRB_yDRFTXwVNWQY', // 2017
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Finding conference and year from playlist name
    record = helper.enrich(
      record,
      'playlist.title',
      '{conference.name} {conference.year}'
    );
    _.update(record, 'conference.year', _.parseInt);

    // Sample:
    //    Lorna Mitchell - Building a Serverless Data Pipeline #hackference2017
    record = helper.enrich(
      record,
      'video.title',
      '{author.name} - {video.title} #hackference2017'
    );

    return record;
  },
};
