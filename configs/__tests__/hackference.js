import config from '../hackference.js';
import helper from '../config-helper.js';

describe('hackference', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('should extract author and title from the title', () => {
      const input = {
        video: {
          title:
            'Lorna Mitchell - Building a Serverless Data Pipeline #hackference2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('author.name', 'Lorna Mitchell');
      expect(actual).toHaveProperty(
        'video.title',
        'Building a Serverless Data Pipeline'
      );
    });

    it('should extract the conference name and year from the playlist', () => {
      const input = {
        playlist: {
          title: 'Hackference 2017',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('conference.name', 'Hackference');
      expect(actual).toHaveProperty('conference.year', 2017);
    });
  });
});
