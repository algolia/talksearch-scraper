/* eslint-disable import/no-commonjs */
jest.mock('node-object-hash');
import nodeObjectHash from 'node-object-hash';
jest.mock('./language');
import language from './language';
import module from './transformer';
import helper from './test-helper';

let current;

describe('transform', () => {
  beforeEach(helper.globalBeforeEach);

  describe('getCaptionUrl', () => {
    beforeEach(() => {
      current = module.internals.getCaptionUrl;
    });

    it('should get a url that goes direction to the start', () => {
      const actual = current('foo', 42);

      expect(actual).toEqual('https://www.youtube.com/watch?v=foo&t=42s');
    });

    it('should have a default url if no caption', () => {
      const actual = current('foo');

      expect(actual).toEqual('https://www.youtube.com/watch?v=foo');
    });

    it('should use the default url if starts at 0s', () => {
      const actual = current('foo', 0);

      expect(actual).toEqual('https://www.youtube.com/watch?v=foo');
    });
  });

  describe('getCaptionDetails', () => {
    beforeEach(() => {
      current = module.internals.getCaptionDetails;
    });

    it('should set the starting second', () => {
      const input = { start: 5.7 };

      const actual = current(input);

      expect(actual).toHaveProperty('start', 5);
    });

    it('should set the duration', () => {
      const input = { duration: 4.86001 };

      const actual = current(input);

      expect(actual).toHaveProperty('duration', 4.86);
    });

    it('should set the content', () => {
      const input = { content: 'foo' };

      const actual = current(input);

      expect(actual).toHaveProperty('content', 'foo');
    });

    it('should set the position', () => {
      const input = {};

      const actual = current(input, 42);

      expect(actual).toHaveProperty('position', 42);
    });

    it('should set the url', () => {
      const caption = { start: 5.86 };
      const videoId = 'foo';

      const actual = current(caption, 42, videoId);

      expect(actual).toHaveProperty(
        'url',
        'https://www.youtube.com/watch?v=foo&t=5s'
      );
    });

    it('should return a default caption if no input caption', () => {
      const actual = current(undefined, 42, 'foo');

      expect(actual).toHaveProperty('content', null);
      expect(actual).toHaveProperty('duration', 0);
      expect(actual).toHaveProperty('start', 0);
      expect(actual).toHaveProperty('position', 42);
      expect(actual).toHaveProperty(
        'url',
        'https://www.youtube.com/watch?v=foo'
      );
    });
  });

  describe('recordsFromVideo', () => {
    let mockGetCaptionDetails;
    let mockGetPopularityScore;
    let mockGetBucketedDate;
    let mockHash;
    beforeEach(() => {
      current = module.internals.recordsFromVideo;
      mockGetCaptionDetails = helper.mockPrivate(module, 'getCaptionDetails');
      mockGetPopularityScore = helper.mockPrivate(module, 'getPopularityScore');
      mockGetBucketedDate = helper.mockPrivate(module, 'getBucketedDate');
      mockHash = jest.fn();
      nodeObjectHash.mockReturnValue({ hash: mockHash });
    });

    it('get one record per caption', () => {
      const input = {
        captions: [{ content: 'foo' }, { content: 'bar' }],
      };

      const actual = current(input);

      expect(actual).toHaveLength(2);
    });

    it('sets the caption details', () => {
      mockGetCaptionDetails.mockReturnValue({ content: 'bar' });
      const input = {
        captions: [{ content: 'foo' }],
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('caption.content', 'bar');
    });

    it('contains the video, playlist and channel info', () => {
      const input = {
        video: { id: 'foo' },
        playlist: { id: 'bar' },
        channel: { id: 'baz' },
      };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('playlist.id', 'bar');
      expect(actual[0]).toHaveProperty('channel.id', 'baz');
    });

    it('still create a record if no captions', () => {
      const input = { video: { id: 'foo' } };

      const actual = current(input);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toHaveProperty('video.id', 'foo');
    });

    it('adds a unique objectID', () => {
      const input = { video: { id: 'foo' } };

      mockHash.mockReturnValue('uuid');

      const actual = current(input);

      expect(actual[0]).toHaveProperty('objectID', 'uuid');
    });

    it('set the popularity score to each record', () => {
      mockGetPopularityScore.mockReturnValue(1234);
      const input = { video: { id: 'foo' } };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('video.popularity.score', 1234);
    });

    it('set the bucketed published date  score to each record', () => {
      mockGetBucketedDate.mockReturnValue({ day: 1, year: 4 });
      const input = { video: { id: 'foo' } };

      const actual = current(input);

      expect(actual[0]).toHaveProperty('video.publishedDate.day', 1);
      expect(actual[0]).toHaveProperty('video.publishedDate.year', 4);
    });
  });

  describe('getPopularityScore', () => {
    beforeEach(() => {
      current = module.internals.getPopularityScore;
    });

    it('sums up all interactions', () => {
      const input = {
        popularity: {
          comments: 1,
          dislikes: 2,
          favorites: 3,
          likes: 4,
          views: 5,
        },
      };

      const actual = current(input);

      expect(actual).toEqual(15);
    });
  });

  describe('getBucketedDate', () => {
    beforeEach(() => {
      current = module.internals.getBucketedDate;
    });

    it('sums up all interactions', () => {
      const input = 1521217180;

      const actual = current(input);

      expect(actual).toHaveProperty('year', 1514761200);
      expect(actual).toHaveProperty('month', 1519858800);
      expect(actual).toHaveProperty('day', 1521154800);
      expect(actual).toHaveProperty('timestamp', input);
    });
  });

  describe('guessConferenceYear', () => {
    it('should guess the year from the playlist title', () => {
      const video = {
        playlist: {
          title: 'Awesome Conference 2018',
        },
      };

      const actual = module.internals.guessConferenceYear(video);

      expect(actual).toEqual(2018);
    });

    it('should return null if no playlist title', () => {
      const video = {};

      const actual = module.internals.guessConferenceYear(video);

      expect(actual).toEqual(null);
    });

    it('should return null if playlist title not parseable', () => {
      const video = {
        playlist: {
          title: 'Not an interesting title',
        },
      };

      const actual = module.internals.guessConferenceYear(video);

      expect(actual).toEqual(null);
    });

    describe('real examples', () => {
      describe('saastr', () => {
        it('2018', () => {
          const input = {
            playlist: {
              title: 'SaaStr Annual 2018: (Some Of) Best Of',
            },
          };

          const actual = module.internals.guessConferenceYear(input);

          expect(actual).toEqual(2018);
        });

        it('2017', () => {
          const input = {
            playlist: {
              title: 'SaaStr Annual 2017 Sessions',
            },
          };

          const actual = module.internals.guessConferenceYear(input);

          expect(actual).toEqual(2017);
        });

        it('2016', () => {
          const input = {
            playlist: {
              title: 'SaaStr Annual 2016',
            },
          };

          const actual = module.internals.guessConferenceYear(input);

          expect(actual).toEqual(2016);
        });
      });
    });
  });

  describe('enrichVideos', () => {
    beforeEach(() => {
      // Enriching through language won't do anything by default
      language.enrichVideos.mockImplementation(args => args);
    });

    it('enrich videos through language', async () => {
      const input = [{ foo: 'bar' }];
      language.enrichVideos.mockImplementation(videos => [
        { ...videos[0], language: true },
      ]);

      const actual = await module.internals.enrichVideos(input);

      expect(actual[0]).toHaveProperty('language', true);
    });

    it('add conference year', async () => {
      const input = [{ foo: 'bar' }];
      helper.mockPrivate(module, 'guessConferenceYear', 2018);

      const actual = await module.internals.enrichVideos(input);

      expect(actual[0]).toHaveProperty('conference.year', 2018);
    });
  });
});
