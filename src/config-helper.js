import _ from 'lodash';

function match(input, pattern) {
  // Identifying each group of {named} patterns
  const patternRegexp = /{.*?}/g;

  // ECMAScript does not *yet* support named matches expression, so we create
  // our own mapping of names to extract and position in the matches
  const namedGroups = _.map(pattern.match(patternRegexp), needle =>
    needle.replace(/{|}/g, '')
  );

  // Convert the simple pattern (using {}), to a real regexp
  const stringRegexp = pattern.replace(patternRegexp, '(.*)');
  const regexp = new RegExp(stringRegexp);

  // Linking each match to its named value
  const matches = input.match(regexp);
  const result = {};
  _.each(_.slice(matches, 1), (needle, index) => {
    _.set(result, namedGroups[index], needle);
  });

  // Discard the _ ignore pattern
  delete result._;

  return result;
}

function enrich(record, path, pattern) {
  const input = _.get(record, path);
  if (!input) {
    return record;
  }

  const matches = match(input, pattern);
  const newRecord = _.merge(record, matches);

  return newRecord;
}

// The year of the talk can often be guessed from the playlist name, as it's the
// only 4-digit word
function guessConferenceYear(record) {
  const playlistTitle = _.get(record, 'playlist.title');
  if (!playlistTitle) {
    return record;
  }
  const conferenceYear = playlistTitle.match(/[0-9]{4}/);

  const newRecord = _.merge(record, {
    conference: {
      year: _.parseInt(conferenceYear),
    },
  });

  return newRecord;
}

// Guess if the input name could be an author name
function isAuthorName(input) {
  const parts = _.split(input, ' ');
  if (parts.length > 2) {
    return false;
  }

  return true;
}

// Splits a string according to multiple separators
function split(input, ...separators) {
  let results = [input];

  _.each(separators, separator => {
    const splitResults = _.map(results, item => item.split(separator));
    const flattenResults = _.flatten(splitResults);
    const trimmedResults = _.compact(_.map(flattenResults, _.trim));

    results = trimmedResults;
  });

  return results;
}

// Trim parts of a string from a given path in the object
function trimKey(rawRecord, path, ...trimList) {
  const record = rawRecord;
  let input = _.get(record, path);
  if (!input) {
    return record;
  }

  _.each(trimList, toTrim => {
    input = _.replace(input, toTrim, '');
  });

  _.set(record, path, _.trim(input));

  return record;
}

const ConfigHelper = {
  match,
  enrich,
  guessConferenceYear,
  isAuthorName,
  split,
  trimKey,
};

export default ConfigHelper;
