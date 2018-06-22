import module from './language';
import helper from './test-helper';
const mockInternal = helper.mock(module.internals);
const mockCache = helper.mock(module.cache);

jest.mock('./disk-logger');

jest.mock('./globals');
import globals from './globals';

jest.mock('./fileutils');
import fileutils from './fileutils';

// jest.mock('@google-cloud/language');
// import googleCloudLanguage from '@google-cloud/language';
// const mockAnalyzeEntities = jest.fn();
// googleCloudLanguage.LanguageServiceClient = function() {
//   return {
//     analyzeEntities: mockAnalyzeEntities,
//   };
// };

describe('language', () => {
  describe('cache', () => {
    beforeEach(() => {
      module.cache.set({});
    });

    describe('grab', () => {
      it('should set the CACHE to the value of the file on disk', async () => {
        fileutils.readJson.mockReturnValue({ foo: 'bar' });

        await module.cache.grab();
        const actual = module.cache.get();

        expect(actual).toHaveProperty('foo', 'bar');
      });

      it('should set the CACHE to {} if no file on disk', async () => {
        fileutils.readJson.mockReturnValue(null);

        await module.cache.grab();
        const actual = module.cache.get();

        expect(actual).toEqual({});
      });
    });

    describe('release', () => {
      it('should write the content of CACHE to disk', async () => {
        module.cache.set({ foo: 'bar' });
        mockCache('filepath', './path/to/cache.json');

        await module.cache.release();

        expect(fileutils.writeJson).toHaveBeenCalledWith(
          './path/to/cache.json',
          {
            foo: 'bar',
          }
        );
      });
    });

    describe('read', () => {
      describe('cache enabled', () => {
        beforeEach(() => {
          globals.readFromCache.mockReturnValue(true);
        });

        it('should return the cache value if available', () => {
          module.cache.set({ foo: [{ input: 'bar', entities: 'baz' }] });
          const actual = module.cache.read('foo', 'bar');

          expect(actual).toEqual('baz');
        });

        it('should return false if no such video if', () => {
          module.cache.set({ foo: [{ input: 'bar', entities: 'baz' }] });
          const actual = module.cache.read('fee', 'bar');

          expect(actual).toEqual(false);
        });

        it('should return false if no such input', () => {
          module.cache.set({ foo: [{ input: 'bar', entities: 'baz' }] });
          const actual = module.cache.read('foo', 'fee');

          expect(actual).toEqual(false);
        });
      });

      describe('cache disabled', () => {
        beforeEach(() => {
          globals.readFromCache.mockReturnValue(false);
        });
        it('should return false', () => {
          const actual = module.cache.read('foo', 'bar');

          expect(actual).toEqual(false);
        });
        it('should return false even if their is a match in the cache', () => {
          module.cache.set({ foo: [{ input: 'bar', entities: 'baz' }] });
          const actual = module.cache.read('foo', 'bar');

          expect(actual).toEqual(false);
        });
      });
    });

    describe('write', () => {
      describe('cache enabled', () => {
        beforeEach(() => {
          globals.readFromCache.mockReturnValue(true);
        });

        it('should add a new input to existing video', () => {
          module.cache.set({ foo: [] });

          module.cache.write('foo', 'bar', 'baz');

          const actual = module.cache.get();

          expect(actual).toHaveProperty('foo', [
            { input: 'bar', entities: 'baz' },
          ]);
        });

        it('should add a new video and input', () => {
          module.cache.set({});

          module.cache.write('foo', 'bar', 'baz');

          const actual = module.cache.get();

          expect(actual).toHaveProperty('foo', [
            { input: 'bar', entities: 'baz' },
          ]);
        });
      });

      describe('cache disabled', () => {
        beforeEach(() => {
          globals.readFromCache.mockReturnValue(false);
        });

        it('should not update the cache', () => {
          module.cache.set({});

          module.cache.write('foo', 'bar', 'baz');

          const actual = module.cache.get();

          expect(actual).toEqual({});
        });
      });
    });
  });

  describe('internals', () => {
    describe('enrichVideo', () => {
      it('should set the speakers to the list of speakers', async () => {
        mockInternal('getSpeakers', 'my_speakers');
        const input = {};

        const actual = await module.internals.enrichVideo(input);

        expect(actual).toHaveProperty('speakers', 'my_speakers');
      });
    });

    describe('getEntities', () => {
      it('should return cache value if exists', async () => {
        mockCache('read', 'foo');

        const actual = await module.internals.getEntities(
          'anything',
          'anything'
        );

        expect(actual).toEqual('foo');
      });

      it('should return entities as returned by the API', async () => {
        mockCache('read');
        const mockAnalyzeEntities = jest
          .fn()
          .mockReturnValue([{ entities: 'foo' }]);
        mockInternal('client', {
          analyzeEntities: mockAnalyzeEntities,
        });

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
        mockCache('write');
        const mockAnalyzeEntities = jest
          .fn()
          .mockReturnValue([{ entities: 'foo' }]);
        mockInternal('client', {
          analyzeEntities: mockAnalyzeEntities,
        });

        await module.internals.getEntities('videoId', 'my sentence');

        expect(module.cache.write).toHaveBeenCalledWith(
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
            title: 'title',
            id: 'videoId',
          },
        };
        const mockGetEntities = mockInternal('getEntities');

        await module.internals.getSpeakers(input);

        expect(mockGetEntities).toHaveBeenCalledWith('videoId', 'title');
      });

      it('should return all speakers', async () => {
        mockInternal('getEntities', [
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

        const actual = await module.internals.getSpeakers();

        expect(actual[0]).toHaveProperty('name', 'Tim Carry');
        expect(actual[1]).toHaveProperty('name', 'John Doe');
      });
    });
  });

  describe('enrichVideos', () => {
    describe('with cache enabled', () => {
      beforeEach(() => {
        globals.readFromCache.mockReturnValue(true);
      });

      it('should call grabCache and releaseCache', async () => {
        const mockGrab = mockCache('grab');
        const mockRelease = mockCache('release');

        const input = [];
        await module.enrichVideos(input);

        expect(mockGrab).toHaveBeenCalled();
        expect(mockRelease).toHaveBeenCalled();
      });
    });

    describe('with cache disabled', () => {
      beforeEach(() => {
        globals.readFromCache.mockReturnValue(false);
      });

      it('should not call grabCache and releaseCache', async () => {
        const mockGrab = mockCache('grab');
        const mockRelease = mockCache('release');

        const input = [];
        await module.enrichVideos(input);

        expect(mockGrab).not.toHaveBeenCalled();
        expect(mockRelease).not.toHaveBeenCalled();
      });
    });

    it('should call enrichVideo on each video', async () => {
      const input = [{ name: 'foo' }, { name: 'bar' }];
      const mockEnrichVideo = mockInternal('enrichVideo');
      mockEnrichVideo.mockImplementation(video => ({ ...video, done: true }));

      const actual = await module.enrichVideos(input);

      expect(mockEnrichVideo).toHaveBeenCalledWith({ name: 'foo' });
      expect(mockEnrichVideo).toHaveBeenCalledWith({ name: 'bar' });
      expect(actual[0]).toHaveProperty('done', true);
      expect(actual[1]).toHaveProperty('done', true);
    });
  });
});
