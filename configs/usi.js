export default {
  indexName: 'usi',
  playlists: [
    'PLyzb9DL11tdZbjRpEDyP4s1pQsxeFg6x2', // 2017
    'PLyzb9DL11tdYqsgu0kQICQKpt0lMz0Nl5', // 2016
    'PLyzb9DL11tdbBE9jpIm76GPcANwSG7Otf', // 2015
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Remove mentions of USI in the title
    helper.trimKey(
      record,
      'video.title',
      ", à l'USI",
      ', at USI',
      'USI 2015 - ',
      'USI 2016 - ',
      'USI 2016 : ',
      'USI 2017'
    );

    // Parse title and speaker name
    record = helper.enrich(
      record,
      'video.title',
      '{video.title} - {_speakers_}'
    );

    return record;
  },
};
