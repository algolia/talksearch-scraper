import _ from 'lodash';
export default {
  indexName: 'laracon',
  playlists: [
    'PLMdXHJK-lGoB-CIVsiQt0WU8WcYrb5eoe', // Laracon EU 2013 - Full Playlist
    'PLMdXHJK-lGoCYhxlU3OJ5bOGhcKtDMkcN', // Laracon EU 2014 - Full Playlist
    'PLMdXHJK-lGoA9SIsuFy0UWL8PZD1G3YFZ', // Laracon EU 2015 - Full Playlist
    'PLMdXHJK-lGoCMkOxqe82hOC8tgthqhHCN', // Laracon EU 2016 - Full Playlist
    'PLMdXHJK-lGoBFZgG2juDXF6LiikpQeLx2', // Laracon EU 2017 - Full Playlist
  ],
  transformData(rawRecord, helper) {
    let record = rawRecord;

    // Get the place and year for the playlist
    record = helper.enrich(
      record,
      'playlist.title',
      'Laracon {conference.year} - Full Playlist'
    );

    // 2013
    if (_.get(record, 'conference.year') === 'EU 2013') {
      record = helper.enrich(
        record,
        'video.title',
        '{_speakers_} - {video.title}'
      );
    }

    // 2014
    if (_.get(record, 'conference.year') === 'EU 2014') {
      record = helper.enrich(
        record,
        'video.title',
        '{_speakers_} - {video.title} at Laracon EU 2014'
      );
    }

    // 2015
    if (_.get(record, 'conference.year') === 'EU 2015') {
      record = helper.enrich(
        record,
        'video.title',
        '{video.title} - {_speakers_} - {_}'
      );
    }

    // 2016-2017
    if (_.includes(['EU 2016', 'EU 2017'], _.get(record, 'conference.year'))) {
      record = helper.enrich(
        record,
        'video.title',
        '{_speakers_} - {video.title} - {_}'
      );
    }

    return record;
  },
};
