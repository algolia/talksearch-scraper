/* eslint-disable import/no-commonjs */
import config from './dotconferences.js';
import helper from '../src/config-helper.js';

describe('dotconferences', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('should extract the author from the title', () => {
      const input = {
        video: {
          title: 'dotJS 2013 - Remy Sharp - iframe abuse',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'Remy Sharp');
    });

    it('should extract the conference name and year from the playlist', () => {
      const input = {
        playlist: {
          title: 'dotJS 2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('conference.name', 'dotJS');
      expect(actual).toHaveProperty('conference.year', 2017);
    });

    it('should extract title information', () => {
      const input = {
        video: {
          title: 'dotJS 2013 - Remy Sharp - iframe abuse',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'Remy Sharp');
      expect(actual).toHaveProperty('video.title', 'iframe abuse');
    });

    it('should keep the title as-is if not following the pattern', () => {
      const input = {
        video: {
          title: 'A day at dotJS 2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('video.title', 'A day at dotJS 2017');
    });
  });
});
