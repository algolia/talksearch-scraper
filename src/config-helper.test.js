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
});
