import _ from 'lodash';
export default {
  indexName: 'algolia-education',
  playlists: ['PLuHdbqhRgWHIVm1e43_7mKUJw3UIreV84'],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Trim the "Algolia Build 101" from the start
    record = helper.trimKey(record, 'video.title', 'Algolia Build 101 - ');

    // Extract the language if one is defined
    const videoTitle = _.get(record, 'video.title');
    const matches = videoTitle.match(/for (.*) developers/);
    if (!_.isEmpty(matches)) {
      const [, language] = matches;
      _.set(record, 'language', language);
    }

    // Remove the speakers
    _.set(record, 'speakers', []);

    return record;
  },
  transformSettings(rawSettings) {
    const settings = rawSettings;

    // Adding custom faceting on the language
    const attributesForFaceting = _.get(rawSettings, 'attributesForFaceting');
    attributesForFaceting.push('language');
    _.set(settings, 'attributesForFaceting', attributesForFaceting);

    return settings;
  },
};
