/* eslint-disable import/no-commonjs */
import config from './saastr.js';
import helper from '../src/config-helper.js';

describe('saastr', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    describe('conference.year', () => {
      it('2018', () => {
        const input = {
          playlist: {
            title: 'SaaStr Annual 2018: (Some Of) Best Of',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('conference.year', 2018);
      });

      it('2017', () => {
        const input = {
          playlist: {
            title: 'SaaStr Annual 2017 Sessions',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('conference.year', 2017);
      });

      it('2016', () => {
        const input = {
          playlist: {
            title: 'SaaStr Annual 2016',
          },
        };

        const actual = current(input);

        expect(actual).toHaveProperty('conference.year', 2016);
      });
    });
  });
});
