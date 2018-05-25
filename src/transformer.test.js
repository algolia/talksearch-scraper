/* eslint-disable import/no-commonjs */
jest.mock('node-object-hash');
const mockHashObject = jest.fn();
require('node-object-hash').mockReturnValue({
  hash: mockHashObject,
});
import module from './transformer';
import helper from './test-helper';

let current;

describe('transform', () => {
  beforeEach(helper.globalBeforeEach);

  describe('recordsFromVideo', () => {
    beforeEach(() => {
      current = module.recordsFromVideo;
    });

    it('get one record per caption', () => {
      const input = {
        captions: [{ content: 'foo bar' }, { content: 'bar baz' }],
      };

      const actual = current(input);

      expect(actual).toHaveLength(2);
    });

    it('contains the video, playlist and channel info', () => {
      const input = {
        video: { id: 'foo' },
        playlist: { id: 'bar' },
        channel: { id: 'baz' },
        captions: [{ content: 'foo bar' }],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('playlist.id', 'bar');
      expect(actual[0]).toHaveProperty('channel.id', 'baz');
    });

    it('contains aggregated duration', () => {
      const input = {
        captions: [
          { content: 'foo bar', duration: 4.86 },
          { content: 'bar baz', duration: 6.24 },
        ],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('caption.duration', 11.1);
    });

    it('sets the start to the start of the first caption', () => {
      const input = {
        captions: [{ start: 3 }, { start: 5 }, { start: 7 }],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('caption.start', 3);
      expect(actual[1]).toHaveProperty('caption.start', 5);
      expect(actual[2]).toHaveProperty('caption.start', 7);
    });

    it('adds the caption position', () => {
      const input = {
        captions: [{ content: 'foo' }, { content: 'bar' }, { content: 'baz' }],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('caption.position', 0);
      expect(actual[1]).toHaveProperty('caption.position', 1);
      expect(actual[2]).toHaveProperty('caption.position', 2);
    });

    it('adds a unique objectID', () => {
      const input = {
        captions: [{ content: 'foo' }, { content: 'bar' }],
      };

      mockHashObject.mockReturnValue('uuid');

      const actual = current(input);

      expect(actual[0]).toHaveProperty('objectID', 'uuid');
    });
  });

  describe('getPopularityScore', () => {
    beforeEach(() => {
      current = module.internals.getPopularityScore;
    });

    it('sums up all interactions', () => {
      const input = {
        popularity: {
          comments: 1,
          dislikes: 2,
          favorites: 3,
          likes: 4,
          views: 5,
        },
      };

      const actual = current(input);

      expect(actual).toEqual(15);
    });
  });

  describe('getBucketedDate', () => {
    beforeEach(() => {
      current = module.internals.getBucketedDate;
    });

    it('sums up all interactions', () => {
      const input = 1521217180;

      const actual = current(input);

      expect(actual).toHaveProperty('year', 1514761200);
      expect(actual).toHaveProperty('month', 1519858800);
      expect(actual).toHaveProperty('day', 1521154800);
      expect(actual).toHaveProperty('timestamp', input);
    });
  });
});
