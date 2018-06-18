/* eslint-disable import/no-commonjs */
import module from './language';
import helper from './test-helper';
jest.mock('./disk-logger');

import fileutils from './fileutils';
jest.mock('./fileutils');

jest.mock('@google-cloud/language');
import googleCloudLanguage from '@google-cloud/language';
const mockAnalyzeEntities = jest.fn();
googleCloudLanguage.LanguageServiceClient = function() {
  return {
    analyzeEntities: mockAnalyzeEntities,
  };
};

describe('language', () => {
  const getCache = module.internals.getCache;
  const setCache = module.internals.setCache;
  const cacheFilePath = './path/to/cache.json';
  beforeEach(helper.globalBeforeEach);
  beforeEach(() => {
    setCache({});
    module.init({});
    helper.mockPrivate(module, 'cacheFilePath', cacheFilePath);
  });

  describe('grabCache', () => {
    it('should set the CACHE to the value of the file on disk', async () => {
      fileutils.readJSON.mockReturnValue({ foo: 'bar' });

      await module.internals.grabCache();
      const actual = getCache();

      expect(actual).toHaveProperty('foo', 'bar');
    });

    it('should set the CACHE to {} if no file on disk', async () => {
      fileutils.readJSON.mockReturnValue(null);

      await module.internals.grabCache();
      const actual = getCache();

      expect(actual).toEqual({});
    });
  });

  describe('releaseCache', () => {
    it('should write the content of CACHE to disk', async () => {
      setCache({ foo: 'bar' });

      await module.internals.releaseCache();

      expect(fileutils.writeJSON).toHaveBeenCalledWith(cacheFilePath, {
        foo: 'bar',
      });
    });
  });

  describe('readFromCache', () => {
    describe('cache enabled', () => {
      beforeEach(() => {
        module.init({ useCache: true });
      });

      it('should return the cache value if available', () => {
        setCache({ foo: [{ input: 'bar', entities: 'baz' }] });
        const actual = module.internals.readFromCache('foo', 'bar');

        expect(actual).toEqual('baz');
      });

      it('should return false if no such video if', () => {
        setCache({ foo: [{ input: 'bar', entities: 'baz' }] });
        const actual = module.internals.readFromCache('fee', 'bar');

        expect(actual).toEqual(false);
      });

      it('should return false if no such input', () => {
        setCache({ foo: [{ input: 'bar', entities: 'baz' }] });
        const actual = module.internals.readFromCache('foo', 'fee');

        expect(actual).toEqual(false);
      });
    });

    describe('cache disabled', () => {
      beforeEach(() => {
        module.init({ useCache: false });
      });
      it('should return false', () => {
        const actual = module.internals.readFromCache('foo', 'bar');

        expect(actual).toEqual(false);
      });
      it('should return false even if their is a match in the cache', () => {
        setCache({ foo: [{ input: 'bar', entities: 'baz' }] });
        const actual = module.internals.readFromCache('foo', 'bar');

        expect(actual).toEqual(false);
      });
    });
  });

  describe('writeToCache', () => {
    describe('cache enabled', () => {
      beforeEach(() => {
        module.init({ useCache: true });
      });

      it('should add a new input to existing video', () => {
        setCache({ foo: [] });

        module.internals.writeToCache('foo', 'bar', 'baz');

        expect(getCache()).toHaveProperty('foo', [
          { input: 'bar', entities: 'baz' },
        ]);
      });

      it('should add a new video and input', () => {
        setCache({});

        module.internals.writeToCache('foo', 'bar', 'baz');

        expect(getCache()).toHaveProperty('foo', [
          { input: 'bar', entities: 'baz' },
        ]);
      });
    });

    describe('cache disabled', () => {
      beforeEach(() => {
        module.init({ useCache: false });
      });

      it('should not update the cache', () => {
        setCache({});

        module.internals.writeToCache('foo', 'bar', 'baz');

        expect(getCache()).toEqual({});
      });
    });
  });

  describe('enrichVideo', () => {
    it('should set the speakers to the list of speakers', async () => {
      helper.mockPrivate(module, 'getSpeakers', 'my_speakers');
      const input = {};

      const actual = await module.internals.enrichVideo(input);

      expect(actual).toHaveProperty('speakers', 'my_speakers');
    });
  });

  describe('enrichVideos', () => {
    describe('with cache enabled', () => {
      beforeEach(() => {
        module.init({ useCache: true });
      });

      it('should call grabCache and releaseCache', async () => {
        const mockGrabCache = helper.mockPrivate(module, 'grabCache');
        const mockReleaseCache = helper.mockPrivate(module, 'releaseCache');

        const input = [];
        await module.enrichVideos(input);

        expect(mockGrabCache).toHaveBeenCalled();
        expect(mockReleaseCache).toHaveBeenCalled();
      });
    });

    describe('with cache disabled', () => {
      beforeEach(() => {
        module.init({ useCache: false });
      });

      it('should not call grabCache and releaseCache', async () => {
        const mockGrabCache = helper.mockPrivate(module, 'grabCache');
        const mockReleaseCache = helper.mockPrivate(module, 'releaseCache');

        const input = [];
        await module.enrichVideos(input);

        expect(mockGrabCache).not.toHaveBeenCalled();
        expect(mockReleaseCache).not.toHaveBeenCalled();
      });
    });

    it('should call enrichVideo on each video', async () => {
      const input = [{ name: 'foo' }, { name: 'bar' }];
      const mockEnrichVideo = helper.mockPrivate(module, 'enrichVideo');
      mockEnrichVideo.mockImplementation(video => ({ ...video, done: true }));

      const actual = await module.enrichVideos(input);

      expect(mockEnrichVideo).toHaveBeenCalledWith({ name: 'foo' });
      expect(mockEnrichVideo).toHaveBeenCalledWith({ name: 'bar' });
      expect(actual[0]).toHaveProperty('done', true);
      expect(actual[1]).toHaveProperty('done', true);
    });
  });

  describe('getEntities', () => {
    let mockReadFromCache;
    beforeEach(() => {
      mockReadFromCache = helper.mockPrivate(module, 'readFromCache');
    });
    it('should return cache value if exists', async () => {
      mockReadFromCache.mockReturnValue('foo');

      const actual = await module.internals.getEntities(
        'videoId',
        'my sentence'
      );

      expect(actual).toEqual('foo');
    });

    it('should return entities as returned by the API', async () => {
      mockAnalyzeEntities.mockReturnValue([{ entities: 'foo' }]);

      const actual = await module.internals.getEntities(
        'videoId',
        'my sentence'
      );

      expect(mockAnalyzeEntities).toHaveBeenCalledWith({
        document: {
          content: 'my sentence',
          type: 'PLAIN_TEXT',
        },
      });
      expect(actual).toEqual('foo');
    });

    it('should save value to cache', async () => {
      const mockWriteToCache = helper.mockPrivate(module, 'writeToCache');
      mockAnalyzeEntities.mockReturnValue([{ entities: 'foo' }]);

      await module.internals.getEntities('videoId', 'my sentence');

      expect(mockWriteToCache).toHaveBeenCalledWith(
        'videoId',
        'my sentence',
        'foo'
      );
    });
  });

  describe('getSpeakers', () => {
    it('should get entities for the specified title and id', async () => {
      const input = {
        video: {
          title: 'foo',
          id: 'bar',
        },
      };
      const mockGetEntities = helper.mockPrivate(module, 'getEntities');

      await module.internals.getSpeakers(input);

      expect(mockGetEntities).toHaveBeenCalledWith('bar', 'foo');
    });

    it('should return all speakers', async () => {
      helper.mockPrivate(module, 'getEntities', [
        {
          type: 'PERSON',
          mentions: [{ type: 'PROPER' }],
          name: 'Tim Carry',
        },
        {
          type: 'PERSON',
          mentions: [{ type: 'COMMON' }],
          name: 'CEO',
        },
        {
          type: 'PERSON',
          mentions: [{ type: 'PROPER' }],
          name: 'John Doe',
        },
        {
          type: 'LOCATION',
          name: 'Tel Aviv',
        },
      ]);

      const actual = await module.internals.getSpeakers('foo', 'bar');

      expect(actual[0]).toHaveProperty('name', 'Tim Carry');
      expect(actual[1]).toHaveProperty('name', 'John Doe');
    });
  });
});
