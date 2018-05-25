/* eslint-disable import/no-commonjs */
import module from './utils';
import helper from './test-helper';
import _ from 'lodash';

let current;

describe('utils', () => {
  beforeEach(helper.globalBeforeEach);

  describe('eachPair', () => {
    beforeEach(() => {
      current = module.eachPair;
    });

    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const mockMethod = jest.fn();

      current(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([3, 4, 1]);
    });

    it('call last element with undefined', () => {
      const input = [1, 2, 3];
      const mockMethod = jest.fn();

      current(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([3, undefined, 1]);
    });
  });

  describe('mapPair', () => {
    beforeEach(() => {
      current = module.mapPair;
    });

    it('map each pair of item', () => {
      const input = [1, 2, 3, 4];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = current(input, method);

      expect(actual).toEqual([3, 8]);
    });

    it('map each pair, even if not enough elements', () => {
      const input = [1, 2, 3];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = current(input, method);

      expect(actual).toEqual([3, 4]);
    });
  });

  describe('eachPairSlide', () => {
    beforeEach(() => {
      current = module.eachPairSlide;
    });

    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const mockMethod = jest.fn();

      current(input, mockMethod);

      expect(mockMethod.mock.calls[0]).toEqual([1, 2, 0]);
      expect(mockMethod.mock.calls[1]).toEqual([2, 3, 1]);
      expect(mockMethod.mock.calls[2]).toEqual([3, 4, 2]);
      expect(mockMethod.mock.calls[3]).toEqual([4, undefined, 3]);
    });
  });

  describe('mapPairSlide', () => {
    beforeEach(() => {
      current = module.mapPairSlide;
    });

    it('loop through pair of items', () => {
      const input = [1, 2, 3, 4];
      const method = (a, b, index) => _.sum([a, b, index]);

      const actual = current(input, method);

      expect(actual).toEqual([3, 6, 9, 7]);
    });
  });
});
