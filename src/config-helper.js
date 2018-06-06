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

  const newRecord = { ...record };
  _.each(matches, (value, key) => {
    _.set(newRecord, key, value);
  });

  return newRecord;
}

const ConfigHelper = {
  match,
  enrich,
};

export default ConfigHelper;
