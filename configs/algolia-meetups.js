import _ from 'lodash';
export default {
  indexName: 'algolia-meetups',
  playlists: [
    'PLuHdbqhRgWHIosfqQ-9whwXzN5sgY7NAk', // TechLunch
    'PLuHdbqhRgWHJg9eOFCl5dgLvVjd_DFz8O', // Search Party
    'PLuHdbqhRgWHJAnKsYLIYB5MV2Srj2dEz3', // Meetups
  ],
  transformData(rawRecord, helper) {
    const record = rawRecord;

    // Get meetup name from playlist id
    const playlistName = _.get(record, 'playlist.title');
    const nameHashes = {
      'TechLunch videos': 'TechLunch',
      'Algolia Search Party': 'Search Party',
      Meetups: 'Meetups',
    };
    _.set(record, 'conference.name', nameHashes[playlistName]);

    // Get year from published date
    const publishedDate = _.get(record, 'video.publishedDate.timestamp');
    _.set(record, 'conference.year', helper.year(publishedDate));

    return record;
  },
};
