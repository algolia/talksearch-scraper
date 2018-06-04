/* eslint-disable import/no-commonjs */
import config from './dotconferences.js';

describe('dotconferences', () => {
  describe('transformData', () => {
    it('should extract the author from the title', () => {
      const input = {
        video: {
          title: 'dotJS 2013 - Remy Sharp - iframe abuse',
        },
      };

      const actual = config.transformData(input);

      expect(actual).toHaveProperty('author.name', 'Remy Sharp');
    });

    it('should extract the conference name and year frùom the playlist', () => {
      const input = {
        playlist: {
          title: 'dotJS 2017',
        },
      };

      const actual = config.transformData(input);

      expect(actual).toHaveProperty('conference.name', 'dotJS');
      expect(actual).toHaveProperty('conference.year', 2017);
    });

    it('should extract title information', () => {
      const input = {
        video: {
          title: 'dotJS 2013 - Remy Sharp - iframe abuse',
        },
      };

      const actual = config.transformData(input);

      expect(actual).toHaveProperty('author.name', 'Remy Sharp');
      expect(actual).toHaveProperty('video.title', 'iframe abuse');
    });

    it('should keep the title as-is if not following the pattern', () => {
      const input = {
        video: {
          title: 'A day at dotJS 2017',
        },
      };

      const actual = config.transformData(input);

      expect(actual).toHaveProperty('video.title', 'A day at dotJS 2017');
    });
  });
});
