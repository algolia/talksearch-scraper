export default {
  indexName: 'takeoffconference',
  playlists: [
    'PLuMK2S9sZg71QqVzwepG-bLBxcJWEzcW9', // 2018
    'PLMz7qMiFSV91TlCtopuwEtoMaPhRx96Tg', // 2014
    'PLMz7qMiFSV93QQUFSDRFWPBcdGHfkySqN', // 2013
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Videos all follow the same
    record = helper.enrich(
      record,
      'video.title',
      '{_} - {video.title} - {_speakers_}'
    );

    return record;
  },
};
