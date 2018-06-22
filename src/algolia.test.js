/* eslint-disable import/no-commonjs */
import module from './algolia';

describe('algolia', () => {
  describe('getLocalObjectIDs', () => {
    it('should return an array of objectIDs', () => {
      const input = [
        { objectID: 'foo' },
        { objectID: 'bar' },
        { objectID: 'baz' },
      ];

      const actual = module.internals.getLocalObjectIDs(input);

      expect(actual).toEqual(['foo', 'bar', 'baz']);
    });
  });
});
