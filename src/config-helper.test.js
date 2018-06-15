/* eslint-disable import/no-commonjs */
import module from './config-helper';
import helper from './test-helper';
import _ from 'lodash';

let current;

describe('utils', () => {
  beforeEach(helper.globalBeforeEach);

  describe('match', () => {
    beforeEach(() => {
      current = module.match;
    });

    it('extracts one simple pattern', () => {
      const input = 'Foo - Bar';
      const pattern = '{name} - Bar';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('name', 'Foo');
    });

    it('extracts several simple patterns', () => {
      const input = 'Foo - Bar';
      const pattern = '{name} - {title}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('name', 'Foo');
      expect(actual).toHaveProperty('title', 'Bar');
    });

    it('extract multiple words', () => {
      const input = 'Foo - A CSS Search Engine';
      const pattern = 'Foo - {title}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('title', 'A CSS Search Engine');
    });

    it('can match deep properties', () => {
      const input = 'Foo - A CSS Search Engine';
      const pattern = 'Foo - {video.title}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('video.title', 'A CSS Search Engine');
    });

    it('allows the _ ignore wilcard', () => {
      const input = 'Foo - Bar';
      const pattern = '{_} - {name}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('name', 'Bar');
      expect(actual).not.toHaveProperty('_');
    });
  });

  describe('enrich', () => {
    beforeEach(() => {
      current = module.enrich;
    });

    it('updates the record at the specified path', () => {
      const record = {
        title: 'Tim Carry - A CSS Search Engine',
      };
      const path = 'title';
      const pattern = '{authorName} - {talkName}';

      const actual = current(record, path, pattern);

      expect(actual).toHaveProperty('authorName', 'Tim Carry');
      expect(actual).toHaveProperty('talkName', 'A CSS Search Engine');
    });

    it('it updates a record at a deep path', () => {
      const record = {
        title: 'Tim Carry - A CSS Search Engine',
      };
      const path = 'title';
      const pattern = '{author.name} - {video.title}';

      const actual = current(record, path, pattern);

      expect(actual).toHaveProperty('author.name', 'Tim Carry');
      expect(actual).toHaveProperty('video.title', 'A CSS Search Engine');
    });

    it('it overwrites the initial key if needed', () => {
      const record = {
        video: {
          title: 'Tim Carry - A CSS Search Engine',
          foo: 'bar',
        },
      };
      const path = 'video.title';
      const pattern = '{author.name} - {video.title}';

      const actual = current(record, path, pattern);

      expect(actual).toHaveProperty('author.name', 'Tim Carry');
      expect(actual).toHaveProperty('video.title', 'A CSS Search Engine');
      expect(actual).toHaveProperty('video.foo', 'bar');
    });

    it('does nothing if cannot find the key', () => {
      const record = {
        foo: 'bar',
      };
      const path = 'bar';
      const pattern = '{author.name} - {video.title}';

      const actual = current(record, path, pattern);

      expect(actual).toEqual(record);
    });
  });

  describe('guessConferenceYear', () => {
    beforeEach(() => {
      current = module.guessConferenceYear;
    });

    it('should guess the year from the playlist title', () => {
      const record = {
        playlist: {
          title: 'Awesome Conference 2018',
        },
      };

      const actual = current(record);

      expect(actual).toHaveProperty('conference.year', 2018);
    });
  });

  describe('isAuthorName', () => {
    beforeEach(() => {
      current = module.isAuthorName;
    });

    describe('true', () => {
      it('should validate simple names', () => {
        const input = 'Piyush Chandra';

        const actual = current(input);

        expect(actual).toEqual(true);
      });
    });

    describe('false', () => {
      it('should reject sentences', () => {
        const input = 'Are Chatbots ready for Enterprise?';

        const actual = current(input);

        expect(actual).toEqual(false);
      });
    });
  });

  describe('split', () => {
    beforeEach(() => {
      current = module.split;
    });

    it('can split with one separator', () => {
      const input = 'foo // bar';

      const actual = current(input, '//');

      expect(actual).toEqual(['foo', 'bar']);
    });

    it('can split by several seperators', () => {
      const input = 'foo // bar | baz';

      const actual = current(input, '//', '|');

      expect(actual).toEqual(['foo', 'bar', 'baz']);
    });

    it('removes empty parts', () => {
      const input = 'foo // bar |';

      const actual = current(input, '//', '|');

      expect(actual).toEqual(['foo', 'bar']);
    });
  });

  describe('trimKey', () => {
    beforeEach(() => {
      current = module.trimKey;
    });

    it('removes one passed trim element from the key', () => {
      const input = {
        video: {
          title: 'foo Conference',
        },
      };

      const actual = current(input, 'video.title', 'Conference');

      expect(actual).toHaveProperty('video.title', 'foo');
    });

    it('removes all passed trim element from the key', () => {
      const input = {
        video: {
          title: 'foo Conference Bar',
        },
      };

      const actual = current(input, 'video.title', 'Conference', 'Bar');

      expect(actual).toHaveProperty('video.title', 'foo');
    });
  });
});
