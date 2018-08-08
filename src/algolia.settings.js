import _ from 'lodash';
// We manually disable typo on years
const yearsTypoDisabled = _.times(60, year => `${1970 + year}`);

const module = {
  searchableAttributes: [
    'unordered(video.title)',
    'unordered(speakers.name)',
    'unordered(caption.content)',
    'unordered(conference.name)',
  ],
  customRanking: [
    'desc(video.hasCaptions)',
    'desc(video.popularity.score)',
    'desc(video.hasManualCaptions)',
    'desc(video.publishedDate.day)',
    'desc(video.duration.minutes)',
    'asc(video.positionInPlaylist)',
    'asc(caption.start)',
  ],
  attributesForFaceting: [
    'speakers.name',
    'conference.name',
    'conference.year',
    'video.hasManualCaptions',
    'video.id',
    'playlist.id',
    'playlist.title',
    'channel.id',
    'channel.title',
  ],
  attributesToSnippet: ['caption.content:8'],
  distinct: true,
  attributeForDistinct: 'video.id',
  highlightPreTag: '<em class="ats-highlight">',
  highlightPostTag: '</em>',
  disableTypoToleranceOnWords: yearsTypoDisabled,
};

export default module;
