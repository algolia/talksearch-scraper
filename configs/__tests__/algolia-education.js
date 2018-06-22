import config from '../algolia-education.js';
import helper from '../config-helper.js';

describe('Algolia Education', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('Algolia Build 101 - Push Data - for Javascript developers', () => {
      const input = {
        video: {
          title: 'Algolia Build 101 - Push Data - for Javascript developers',
        },
      };

      const actual = current(input);

      expect(actual).toMatchSnapshot();
    });
  });
});
