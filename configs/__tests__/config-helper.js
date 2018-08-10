import module from '../config-helper';

let current;

describe('configHelper', () => {
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

      expect(actual['video.title']).toEqual('A CSS Search Engine');
    });

    it('allows the _ ignore wilcard', () => {
      const input = 'Foo - Bar';
      const pattern = '{_} - {name}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('name', 'Bar');
      expect(actual).not.toHaveProperty('_');
    });

    it('returns false if no match', () => {
      const input = 'Foo // Bar';
      const pattern = '{_} - {name}';

      const actual = current(input, pattern);

      expect(actual).toEqual(false);
    });

    it('extract patterns when pipes in the input', () => {
      const input = 'Foo | XXX | Bar';
      const pattern = 'Foo | XXX | {name}';

      const actual = current(input, pattern);

      expect(actual).toHaveProperty('name', 'Bar');
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

    it('it converts speakers to an array with names', () => {
      const record = {
        video: {
          title: 'Tim Carry - bar',
        },
      };
      const path = 'video.title';
      const pattern = '{_speaker_} - {video.title}';

      const actual = current(record, path, pattern);

      expect(actual).toHaveProperty('speakers', [{ name: 'Tim Carry' }]);
    });

    it('replace the existing list of speakers', () => {
      const record = {
        speakers: [{ name: 'foo' }, { name: 'bar' }],
        video: {
          title: 'Tim Carry - bar',
        },
      };
      const path = 'video.title';
      const pattern = '{_speaker_} - {video.title}';

      const actual = current(record, path, pattern);

      expect(actual).toHaveProperty('speakers', [{ name: 'Tim Carry' }]);
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

  describe('year', () => {
    it('should return the year of a given date', () => {
      const input = 1490979292;

      const actual = module.year(input);

      expect(actual).toEqual(2017);
    });
  });
});
