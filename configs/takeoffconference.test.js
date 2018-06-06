/* eslint-disable import/no-commonjs */
import config from './takeoffconference.js';
import helper from '../src/config-helper.js';

describe('takeoffconference', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('should extract author and title from the title', () => {
      const input = {
        video: {
          title: 'TakeOff 2013 - JSONiq - William Candillon',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'William Candillon');
      expect(actual).toHaveProperty('video.title', 'JSONiq');
    });

    it('should extract the conference year from the playlist', () => {
      const input = {
        playlist: {
          title: 'Take Off Conference 2013',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('conference.year', 2013);
    });
  });
});
