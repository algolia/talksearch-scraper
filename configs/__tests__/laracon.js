import config from '../laracon.js';
import helper from '../config-helper.js';

describe('laracon', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('playlist name', () => {
      const input = {
        playlist: {
          title: 'Laracon EU 2014 - Full Playlist',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('conference.year', 'EU 2014');
    });

    describe('2013', () => {
      it('speaker and title', () => {
        const input = {
          playlist: {
            title: 'Laracon EU 2013 - Full Playlist',
          },
          video: {
            title: 'Ben Corlett - Bridging the Gap',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Bridging the Gap');
        expect(actual).toHaveProperty('speakers', [{ name: 'Ben Corlett' }]);
      });
    });

    describe('2014', () => {
      it('speaker and title', () => {
        const input = {
          playlist: {
            title: 'Laracon EU 2014 - Full Playlist',
          },
          video: {
            title:
              "Ross Tuck - Things I Believe Now That I'm Old at Laracon EU 2014",
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty(
          'video.title',
          "Things I Believe Now That I'm Old"
        );
        expect(actual).toHaveProperty('speakers', [{ name: 'Ross Tuck' }]);
      });
    });

    describe('2015', () => {
      it('speaker and title', () => {
        const input = {
          playlist: {
            title: 'Laracon EU 2015 - Full Playlist',
          },
          video: {
            title: 'The Tao of Laravel - Taylor Otwell - Laracon EU 2015',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'The Tao of Laravel');
        expect(actual).toHaveProperty('speakers', [{ name: 'Taylor Otwell' }]);
      });
    });

    describe('2016-2017', () => {
      it('speaker and title', () => {
        const input = {
          playlist: {
            title: 'Laracon EU 2017 - Full Playlist',
          },
          video: {
            title: 'Christopher Pitt - Transforming PHP - Laracon EU 2017',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('video.title', 'Transforming PHP');
        expect(actual).toHaveProperty('speakers', [
          { name: 'Christopher Pitt' },
        ]);
      });
    });
  });
});
