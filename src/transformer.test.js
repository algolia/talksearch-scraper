/* eslint-disable import/no-commonjs */
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
        video: 'foo',
        playlist: 'baz',
        channel: 'bar',
        captions: [{ content: 'foo bar' }],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('video', 'foo');
      expect(actual[0]).toHaveProperty('playlist', 'baz');
      expect(actual[0]).toHaveProperty('channel', 'bar');
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
  });
});
