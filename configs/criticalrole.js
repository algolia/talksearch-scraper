import _ from 'lodash';

export default {
  indexName: 'criticalrole',
  playlists: [
    'PL1tiwbzkOjQz7D0l_eLJGAISVtcL7oRu_', // Campaign 1: Vox Machina
    'PL1tiwbzkOjQxD0jjAE7PsWoaCrs0EkBH2', // Campaign 2: The Mighty Nein
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    const initialTitle = record.video.title;

    // Campaign 2
    if (_.includes(initialTitle, 'Campaign 2')) {
      record = helper.enrich(
        record,
        'video.title',
        '{video.title} | Critical Role | Campaign 2, Episode {video.episodeNumber}'
      );
      record.video.campaignNumber = 2;
      record.video.episodeNumber = _.parseInt(record.video.episodeNumber);
      return record;
    }

    // Campaign 1
    record.video.campaignNumber = 1;
    record = helper.enrich(
      record,
      'video.title',
      '{_} Episode {video.episodeNumber}'
    );
    const episodeNumber = _.get(record, 'video.episodeNumber');

    const parts = helper.split(initialTitle, '-', '|');
    let videoTitle = parts[0];

    const episodePartRegexp = new RegExp('[0-9]* pt. (.*)');
    const severalPartsMatch = episodeNumber.match(episodePartRegexp);
    if (severalPartsMatch) {
      videoTitle = `${videoTitle}, part ${severalPartsMatch[1]}`;
    }

    _.set(record, 'video.episodeNumber', _.parseInt(episodeNumber));
    _.set(record, 'video.title', videoTitle);

    return record;
  },
};
