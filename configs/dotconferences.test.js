/* eslint-disable import/no-commonjs */
import config from './dotconferences.js';

describe('dotconferences', () => {
  describe('transformData', () => {
    it('should extract title information', () => {
      const input = {
        video: {
          title: 'dotJS 2013 - Remy Sharp - iframe abuse',
        },
      };

      const actual = config.transformData(input);

      expect(actual).toHaveProperty('conference.name', 'dotJS');
      expect(actual).toHaveProperty('conference.year', 2013);
      expect(actual).toHaveProperty('author.name', 'Remy Sharp');
      expect(actual).toHaveProperty('video.title', 'iframe abuse');
    });
  });
});
