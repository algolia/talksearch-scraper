import _ from 'lodash';
import config from '../algolia-meetups.js';
import helper from '../config-helper.js';

describe('Algolia Meetups', () => {
  describe('transformData', () => {
    let current;
    beforeEach(() => {
      current = input => config.transformData(input, helper);
    });

    it('sets the year to 2017', () => {
      const input = {};
      _.set(input, 'video.publishedDate.timestamp', 1490979292);

      const actual = current(input);

      expect(actual).toHaveProperty('conference.year', 2017);
    });

    it('sets the conference name to TechLunch', () => {
      const input = {};
      _.set(input, 'playlist.title', 'TechLunch videos');

      const actual = current(input);

      expect(actual).toHaveProperty('conference.name', 'TechLunch');
    });

    it('sets the conference name to Search Party', () => {
      const input = {};
      _.set(input, 'playlist.title', 'Algolia Search Party');

      const actual = current(input);

      expect(actual).toHaveProperty('conference.name', 'Search Party');
    });

    it('sets the conference name to Meetups', () => {
      const input = {};
      _.set(input, 'playlist.title', 'Meetups');

      const actual = current(input);

      expect(actual).toHaveProperty('conference.name', 'Meetups');
    });
  });
});
