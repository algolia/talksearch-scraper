/* eslint-disable import/no-commonjs */
import module from './algolia';
import helper from './test-helper';
let current;

describe('algolia', () => {
  beforeEach(helper.globalBeforeEach);

  describe('getLocalObjectIDs', () => {
    beforeEach(() => {
      current = module.internals.getLocalObjectIDs;
    });

    it('should return an array of objectIDs', () => {
      const input = [
        { objectID: 'foo' },
        { objectID: 'bar' },
        { objectID: 'baz' },
      ];

      const actual = current(input);

      expect(actual).toEqual(['foo', 'bar', 'baz']);
    });
  });
});
