import _ from 'lodash';
import dayjs from 'dayjs';

/**
 * Returns an object with (deep) keys matching the {named} patterns.
 * Example:
 *     helper.match('John Doe - 2018', '{video.title} - {conference.year}')
 *     => { video: { title: 'John Doe' }, conference: { year: '2018' } }
 * @param {String} input Initial string to parse
 * @param {String} pattern Pattern string
 * @returns {Object} Object containing matching keys
 * Note: The special {_} pattern can be used to discard a match from the result.
 **/
function match(input, pattern) {
  // Identifying each group of {named} patterns
  const patternRegexp = /{.*?}/g;

  // ECMAScript does not *yet* support named matches expression, so we create
  // our own mapping of names to extract and position in the matches
  const namedGroups = _.map(pattern.match(patternRegexp), needle =>
    needle.replace(/{|}/g, '')
  );

  // Convert the simple pattern (using {}), to a real regexp
  let stringRegexp = pattern.replace(patternRegexp, '(.*)');
  // Also escape characters in the pattern that should not be treated as regexp
  stringRegexp = _.replace(stringRegexp, /\|/g, '\\|');
  const regexp = new RegExp(stringRegexp);

  // Linking each match to its named value
  const matches = input.match(regexp);

  // No match found
  if (!matches) {
    return false;
  }

  const result = {};
  _.each(namedGroups, (namedGroup, index) => {
    result[namedGroup] = matches[index + 1];
  });
  // Discard the _ ignore pattern
  delete result._;

  return result;
}

/**
 * Match patterns on a specific key of the record and enrich other keys with
 * what is extracted.
 * Example:
 *     const input = { video: { title: 'John Doe - 2018' } }
 *     helper.enrich(input, 'video.title', '{speaker.name} - {conference.year}')
 *     => {
 *          video: {
 *            title: 'John Doe - 2018'
 *          },
 *          speaker: {
 *            name: 'John Doe'
 *          },
 *          conference: {
 *            year: '2018'
 *          }
 *        }
 * @param {Object} record Initial object to enrich
 * @param {String} path Path of the key to read
 * @param {String} pattern Pattern to use for extracting
 * @returns {Object} Original object, enriched with extracted patterns
 **/
function enrich(record, path, pattern) {
  const newRecord = record;
  const input = _.get(record, path);
  if (!input) {
    return record;
  }

  const matches = match(input, pattern);

  // Update the keys with the new values
  _.each(matches, (value, key) => {
    let newKey = key;
    let newValue = value;
    if (key === '_speaker_') {
      const allSpeakers = split(value, '&', ',');
      newValue = _.map(allSpeakers, speakerName => ({ name: speakerName }));
      newKey = 'speakers';
    }
    _.set(newRecord, newKey, newValue);
  });

  return newRecord;
}

/**
 * Splits a string according to multiple separators
 * Example:
 *     helper.trim('foo / bar | baz', '/', '|');
 *     => ['foo', 'bar', 'baz']
 * @param {String} input Initial string to split
 * @param {String} ...separators List of separators to use
 * @returns {Array} Array of elements
 * Note that this will trim all elements
 **/
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

/**
 * Remove all unwanted elements from a specific key of the element
 * Example:
 *     const input = { video: { title: 'foobar // 2018 conference' } }
 *     helper.trimKey(input, 'video.title', '// 2018 conference');
 * @param {String} rawRecord Initial object to modify
 * @param {String} path Path of the key to update
 * @param {String} ...trimList List of strings to remove
 * @returns {Object} Modified object
 * Note that this will trim the final value
 **/
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

/**
 * Returns a year from a timestamp
 * @param {Number} timestamp Unix timestamp
 * @returns {Number} YYYY-formatted year
 **/
function year(timestamp) {
  return _.parseInt(dayjs(timestamp * 1000).format('YYYY'));
}

const ConfigHelper = {
  match,
  enrich,
  split,
  trimKey,
  year,
};

export default ConfigHelper;
