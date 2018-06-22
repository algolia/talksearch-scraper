/* eslint-disable import/no-commonjs */
import module from './utils';
import _ from 'lodash';

describe('utils', () => {
  describe('eachPair', () => {
    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const mockMethod = jest.fn();

      module.eachPair(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([3, 4, 1]);
    });

    it('call last element with undefined', () => {
      const input = [1, 2, 3];
      const mockMethod = jest.fn();

      module.eachPair(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([3, undefined, 1]);
    });
  });

  describe('mapPair', () => {
    it('map each pair of item', () => {
      const input = [1, 2, 3, 4];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = module.mapPair(input, method);

      expect(actual).toEqual([3, 8]);
    });

    it('map each pair, even if not enough elements', () => {
      const input = [1, 2, 3];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = module.mapPair(input, method);

      expect(actual).toEqual([3, 4]);
    });
  });

  describe('eachPairSlide', () => {
    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const mockMethod = jest.fn();

      module.eachPairSlide(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([2, 3, 1]);
      expect(mockMethod.mock.calls[2]).toEqual([3, 4, 2]);
      expect(mockMethod.mock.calls[3]).toEqual([4, undefined, 3]);
    });
  });

  describe('mapPairSlide', () => {
    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = module.mapPairSlide(input, method);

      expect(actual).toEqual([3, 6, 9, 7]);
    });

    it('calls it once if array is empty', () => {
      const input = [];
      const method = jest.fn();

      module.mapPairSlide(input, method);

      expect(method).toHaveBeenCalledTimes(1);
    });
  });
});
