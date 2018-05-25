import _ from 'lodash';

/**
 * Call methodName on each pair of elements in the collection. Last argument
 * will be the index in the loop.
 * Example:
 *  eachPair([1, 2, 3], fn()) will call fn(1, 2, 0), fn(3, undefined, 1);
 *
 * @param {Array} collection The list of elements
 * @param {Function} method The method to call on each pair
 * @returns {void}
 **/
function eachPair(collection, method) {
  let index = 0;
  _.each(collection, (item, i) => {
    if (i % 2 === 1) {
      return;
    }
    method(collection[i], collection[i + 1], index++);
  });
}

/**
 * Map methodName on each pair of elements in the collection.
 * Example:
 *  eachPair([1, 2, 3], fn()) will map fn(1, 2), fn(3, undefined);
 *
 * @param {Array} collection The list of elements
 * @param {Function} method The method to map on each pair
 * @returns {Array} An array of each pair of element passed through method
 **/
function mapPair(collection, method) {
  let index = 0;
  const results = [];
  _.each(collection, (item, i) => {
    if (i % 2 === 1) {
      return;
    }
    results.push(method(collection[i], collection[i + 1], index++));
  });
  return results;
}

/**
 * Call methodName on each pair of elements in the collection. This will slide
 * through all elements
 * Example:
 *  eachPairSlide([1, 2, 3], fn()) will call fn(1, 2), fn(2, 3) and fn(3, undefined);
 *
 * @param {Array} collection The list of elements
 * @param {Function} method The method to call on each pair
 * @returns {void}
 **/
function eachPairSlide(collection, method) {
  _.each(collection, (item, i) => {
    method(collection[i], collection[i + 1], i);
  });
}

/**
 * Map methodName on each pair of elements in the collection. This will slide
 * through all elements
 * Example:
 *  mapPairSlide([1, 2, 3], fn()) will return fn(1, 2), fn(2, 3) and fn(3, undefined);
 *
 * @param {Array} collection The list of elements
 * @param {Function} method The method to call on each pair
 * @returns {Array} An array of each pair of element passed through method
 **/
function mapPairSlide(collection, method) {
  return _.map(collection, (item, i) =>
    method(collection[i], collection[i + 1], i)
  );
}

export { eachPair, mapPair, eachPairSlide, mapPairSlide };
export default { eachPair, mapPair, eachPairSlide, mapPairSlide };
