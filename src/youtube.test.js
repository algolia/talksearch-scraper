/* eslint-disable import/no-commonjs */
import module from './youtube';
import helper from './test-helper';
jest.mock('./disk-logger');
jest.mock('./fileutils');
jest.mock('axios');
const axios = require('axios');
const objectContaining = expect.objectContaining;
const anyString = expect.any(String);
const anyObject = expect.any(Object);

let current;

describe('youtube', () => {
  beforeEach(helper.globalBeforeEach);

  describe('getPlaylistData', () => {
    beforeEach(() => {
      current = module.internals.getPlaylistData;
    });

    it('return an object with playlist data', async () => {
      const playlistId = 42;
      const mockValue = {
        items: [
          {
            snippet: {
              title: 'foo',
              description: 'bar',
            },
          },
        ],
      };
      helper.mockPrivate(module, 'get', mockValue);

      const actual = await current(playlistId);

      expect(actual).toHaveProperty('id', 42);
      expect(actual).toHaveProperty('title', 'foo');
      expect(actual).toHaveProperty('description', 'bar');
    });
  });

  describe('getVideosFromPlaylist', () => {
    let mockGet;
    let mockGetPlaylistData;
    let mockGetVideosFromPlaylistPage;
    beforeEach(() => {
      current = module.internals.getVideosFromPlaylist;
      mockGet = helper.mockPrivate(module, 'get');
      mockGetPlaylistData = helper.mockPrivate(module, 'getPlaylistData');
      mockGetVideosFromPlaylistPage = helper.mockPrivate(
        module,
        'getVideosFromPlaylistPage'
      );
    });

    // should get what is returned by the other call
    // should allow pagination
    // should add the playlistinfo to all elements

    it('should get all videos from the unique page', async () => {
      mockGet.mockReturnValue({
        nextPageToken: null,
      });
      mockGetVideosFromPlaylistPage.mockReturnValue([
        { foo: 'bar' },
        { bar: 'baz' },
      ]);

      const actual = await current();

      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('foo', 'bar');
      expect(actual[1]).toHaveProperty('bar', 'baz');
    });

    it('should get all videos from several pages', async () => {
      mockGet.mockReturnValueOnce({
        nextPageToken: 'token',
      });
      mockGet.mockReturnValueOnce({
        nextPageToken: null,
      });
      mockGetVideosFromPlaylistPage.mockReturnValueOnce([
        { key: 'foo' },
        { key: 'bar' },
      ]);
      mockGetVideosFromPlaylistPage.mockReturnValueOnce([{ key: 'baz' }]);

      const actual = await current();

      expect(actual[0]).toHaveProperty('key', 'foo');
      expect(actual[1]).toHaveProperty('key', 'bar');
      expect(actual[2]).toHaveProperty('key', 'baz');
    });

    it('should add the playlist data to each item', async () => {
      mockGet.mockReturnValue({
        nextPageToken: null,
      });
      mockGetVideosFromPlaylistPage.mockReturnValue([
        { foo: 'bar' },
        { bar: 'baz' },
      ]);
      mockGetPlaylistData.mockReturnValue('playlistData');

      const actual = await current();

      expect(actual[0]).toHaveProperty('playlist', 'playlistData');
      expect(actual[1]).toHaveProperty('playlist', 'playlistData');
    });
  });

  describe('getVideosFromPlaylistPage', () => {
    let mockGetVideosData;
    beforeEach(() => {
      current = module.internals.getVideosFromPlaylistPage;
      mockGetVideosData = helper.mockPrivate(module, 'getVideosData');
    });

    it('should reconcile page information and detail information', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
            snippet: { positionInPlaylist: 42 },
          },
        ],
      };
      mockGetVideosData.mockReturnValue({
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await current(input);

      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 42);
      expect(actual[0]).toHaveProperty('video.title', 'foo bar');
    });

    it('should discard videos with no details', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
            snippet: { positionInPlaylist: 42 },
          },
          {
            contentDetails: { videoId: 'bar' },
            snippet: { positionInPlaylist: 43 },
          },
        ],
      };
      mockGetVideosData.mockReturnValue({
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await current(input);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 42);
      expect(actual[0]).toHaveProperty('video.title', 'foo bar');
    });

    fit('should warn about videos without data', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo', customInfo: 'bar' },
          },
          {
            contentDetails: { videoId: 'bar' },
          },
        ],
      };
      mockGetVideosData.mockReturnValue({
        bar: {
          video: { id: 'bar' },
        },
      });

      const mockWarning = jest.fn();
      module.on('warning', mockWarning);

      await current(input);

      expect(mockWarning).toHaveBeenCalledWith(anyString, [
        'https://youtu.be/foo',
      ]);
    });
  });

  describe('formatCaption', () => {
    beforeEach(() => {
      current = module.internals.formatCaptions;
    });
    it('hasCaptions should be false if no caption is found', () => {
      const data = {};
      const captions = [];

      const actual = current(data, captions);

      expect(actual).toHaveProperty('hasCaptions', false);
    });
    it('hasCaptions should be true if at least one caption is found', () => {
      const data = {};
      const captions = [{}];

      const actual = current(data, captions);

      expect(actual).toHaveProperty('hasCaptions', true);
    });
    it('hasManualCaptions should be true if contentDetails.caption is set to true', () => {
      const data = {
        contentDetails: {
          caption: 'true',
        },
      };
      const captions = [];

      const actual = current(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', true);
    });
    it('hasManualCaptions should be false if contentDetails.caption is set to false', () => {
      const data = {
        contentDetails: {
          caption: 'false',
        },
      };
      const captions = [];

      const actual = current(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', false);
    });
  });

  describe('formatPopularity', () => {
    beforeEach(() => {
      current = module.internals.formatPopularity;
    });
    it('it should extract popularity counts from the data', () => {
      const data = {
        statistics: {
          commentCount: '5',
          dislikeCount: '0',
          favoriteCount: '0',
          likeCount: '169',
          viewCount: '3798',
        },
      };

      const actual = current(data);

      expect(actual).toHaveProperty('comments', 5);
      expect(actual).toHaveProperty('dislikes', 0);
      expect(actual).toHaveProperty('favorites', 0);
      expect(actual).toHaveProperty('likes', 169);
      expect(actual).toHaveProperty('views', 3798);
    });
  });

  describe('formatDuration', () => {
    beforeEach(() => {
      current = module.internals.formatDuration;
    });
    it('it should convert the duration a .minutes .seconds object', () => {
      const data = {
        contentDetails: {
          duration: 'PT4M25S',
        },
      };

      const actual = current(data);

      expect(actual).toHaveProperty('minutes', 4);
      expect(actual).toHaveProperty('seconds', 25);
    });
  });

  describe('formatChannel', () => {
    beforeEach(() => {
      current = module.internals.formatChannel;
    });
    it('should contain the id and title', () => {
      const data = {
        snippet: {
          channelId: 'foo',
          channelTitle: 'bar',
        },
      };

      const actual = current(data);

      expect(actual).toHaveProperty('id', 'foo');
      expect(actual).toHaveProperty('title', 'bar');
    });
  });

  describe('formatVideo', () => {
    let mockFormatCaptions;
    let mockFormatPopularity;
    let mockFormatDuration;
    beforeEach(() => {
      current = module.internals.formatVideo;
      mockFormatCaptions = helper.mockPrivate(module, 'formatCaptions');
      mockFormatPopularity = helper.mockPrivate(module, 'formatPopularity');
      mockFormatDuration = helper.mockPrivate(module, 'formatDuration');
    });

    it('should contain the videoId', () => {
      const input = {
        id: 'foo',
      };

      const actual = current(input);

      expect(actual).toHaveProperty('id', 'foo');
    });

    it('should contain base information', () => {
      const input = {
        snippet: {
          title: 'Video title',
          description: 'Video description',
          thumbnails: 'thumbnails',
          defaultAudioLanguage: 'en',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('title', 'Video title');
      expect(actual).toHaveProperty('description', 'Video description');
      expect(actual).toHaveProperty('thumbnails', 'thumbnails');
      expect(actual).toHaveProperty('language', 'en');
    });

    it('should contain extended information', () => {
      const input = {};
      mockFormatCaptions.mockReturnValue({ foo: 'bar' });
      mockFormatPopularity.mockReturnValue('popularity');
      mockFormatDuration.mockReturnValue('duration');

      const actual = current(input);

      expect(actual).toHaveProperty('popularity', 'popularity');
      expect(actual).toHaveProperty('duration', 'duration');
      expect(actual).toHaveProperty('foo', 'bar');
    });

    it('should contain published date as timestamp', () => {
      const input = {
        snippet: {
          publishedAt: '2018-03-16T16:04:29.000Z',
        },
      };

      const actual = current(input);

      expect(actual).toHaveProperty('publishedDate', 1521216269);
    });
  });

  describe('getVideosData', () => {
    let mockGet;
    let mockGetCaptions;
    let mockFormatChannel;
    let mockFormatVideo;
    beforeEach(() => {
      current = module.internals.getVideosData;
      mockGet = helper.mockPrivate(module, 'get');
      mockGetCaptions = helper.mockPrivate(module, 'getCaptions');
      mockFormatChannel = helper.mockPrivate(module, 'formatChannel');
      mockFormatVideo = helper.mockPrivate(module, 'formatVideo');
    });

    it('calls /videos with only one id', async () => {
      const input = 'foo';

      await current(input);

      expect(mockGet).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo' })
      );
    });

    it('calls /videos with several ids', async () => {
      const input = ['foo', 'bar'];

      await current(input);

      expect(mockGet).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo,bar' })
      );
    });

    it('sets the channel key to each video', async () => {
      mockGet.mockReturnValue({ items: [{ id: 'foo' }] });
      mockFormatChannel.mockReturnValue('channel info');

      const actual = await current();

      expect(actual).toHaveProperty('foo.channel', 'channel info');
    });

    it('sets the video key to each video', async () => {
      mockGet.mockReturnValue({ items: [{ id: 'foo' }] });
      mockFormatVideo.mockReturnValue('video info');

      const actual = await current();

      expect(actual).toHaveProperty('foo.video', 'video info');
    });

    it('sets the .captions key', async () => {
      mockGet.mockReturnValue({ items: [{ id: 'foo' }] });
      mockGetCaptions.mockReturnValue('captions');

      const actual = await current();

      expect(actual).toHaveProperty('foo.captions', 'captions');
    });
  });

  describe('getCaptions', () => {
    beforeEach(() => {
      current = module.internals.getCaptions;
    });

    it('returns a list of captions', async () => {
      helper.mockPrivate(module, 'getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.499" start="13.28">foo bar</text>
  <text dur="5.25" start="16.02">bar baz</text>
</transcript>
`,
      });

      const actual = await current(42);

      expect(axios.get).toHaveBeenCalledWith('{caption_url}');
      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('start', 13.28);
      expect(actual[0]).toHaveProperty('duration', 5.5);
      expect(actual[0]).toHaveProperty('content', 'foo bar');
      expect(actual[1]).toHaveProperty('content', 'bar baz');
    });

    it('removes HTML from captions', async () => {
      helper.mockPrivate(module, 'getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.25" start="16.02">&lt;font color="#CCCCCC"&gt;foo&lt;/font&gt;&lt;font color="#E5E5E5"&gt; bar&lt;/font&gt;</text>
</transcript>
`,
      });

      const actual = await current(42);

      expect(actual[0]).toHaveProperty('content', 'foo bar');
    });

    it('returns an empty array if no url found', async () => {
      helper.mockPrivate(module, 'getCaptionsUrl', null);

      const actual = await current(42);

      expect(actual).toEqual([]);
    });

    it('returns an empty array if no captions', async () => {
      helper.mockPrivate(module, 'getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
</transcript>
`,
      });

      const actual = await current(42);

      expect(actual).toEqual([]);
    });
  });

  /* eslint-disable camelcase */
  describe('getCaptionsUrl', () => {
    beforeEach(() => {
      current = module.internals.getCaptionsUrl;
    });

    it('should get the url from a well formed data tree', async () => {
      const mockValue = {
        player_response: {
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [
                { languageCode: 'fr', baseUrl: 'BAD' },
                { languageCode: 'en', baseUrl: 'GOOD' },
              ],
            },
          },
        },
      };
      helper.mockPrivate(module, 'getRawVideoInfo', mockValue);
      const input = 'videoId';

      const actual = await current(input);

      expect(actual).toEqual('GOOD');
    });

    it('should return undefined if no caption url', async () => {
      const mockValue = {
        player_response: {
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [],
            },
          },
        },
      };
      helper.mockPrivate(module, 'getRawVideoInfo', mockValue);
      const input = 'videoId';

      const actual = await current(input);

      expect(actual).toEqual(undefined);
    });
  });
  /* eslint-enable camelcase */
});
