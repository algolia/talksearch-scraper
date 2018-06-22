import module from './youtube';
import helper from './test-helper';
const mockInternal = helper.mock(module.internals);

jest.mock('./disk-logger');
jest.mock('./fileutils');

import axios from 'axios';
jest.mock('axios');

jest.mock('./pulse');
import pulse from './pulse';
pulse.emit = jest.fn();

const objectContaining = expect.objectContaining;
const anyString = expect.any(String);

describe('youtube', () => {
  describe('getPlaylistData', () => {
    it('return an object with playlist data', async () => {
      const playlistId = 42;
      mockInternal('get', {
        items: [
          {
            snippet: {
              title: 'foo',
              description: 'bar',
            },
          },
        ],
      });

      const actual = await module.internals.getPlaylistData(playlistId);

      expect(actual).toHaveProperty('id', 42);
      expect(actual).toHaveProperty('title', 'foo');
      expect(actual).toHaveProperty('description', 'bar');
    });
  });

  describe('getVideosFromPlaylist', () => {
    it('should get all videos from the unique page', async () => {
      mockInternal('getPlaylistData', { nextPageToken: null });
      mockInternal('getVideosFromPlaylistPage', [
        { foo: 'bar' },
        { bar: 'baz' },
      ]);

      const actual = await module.internals.getVideosFromPlaylist();

      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('foo', 'bar');
      expect(actual[1]).toHaveProperty('bar', 'baz');
    });

    it('should get all videos from several pages', async () => {
      mockInternal('getPlaylistData');
      mockInternal('get')
        .mockReturnValueOnce({ nextPageToken: 'token' })
        .mockReturnValueOnce({ nextPageToken: null });
      mockInternal('getVideosFromPlaylistPage')
        .mockReturnValueOnce([{ key: 'foo' }, { key: 'bar' }])
        .mockReturnValueOnce([{ key: 'baz' }]);

      const actual = await module.internals.getVideosFromPlaylist();

      expect(actual[0]).toHaveProperty('key', 'foo');
      expect(actual[1]).toHaveProperty('key', 'bar');
      expect(actual[2]).toHaveProperty('key', 'baz');
    });

    it('should add the playlist data to each item', async () => {
      mockInternal('getPlaylistData', 'playlistData');
      mockInternal('get', { nextPageToken: null });
      mockInternal('getVideosFromPlaylistPage', [
        { foo: 'bar' },
        { bar: 'baz' },
      ]);

      const actual = await module.internals.getVideosFromPlaylist();

      expect(actual[0]).toHaveProperty('playlist', 'playlistData');
      expect(actual[1]).toHaveProperty('playlist', 'playlistData');
    });
  });

  describe('getVideosFromPlaylistPage', () => {
    it('should reconcile page information and detail information', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
            snippet: { position: 42 },
          },
        ],
      };
      mockInternal('getVideosData', {
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await module.internals.getVideosFromPlaylistPage(input);

      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 42);
      expect(actual[0]).toHaveProperty('video.title', 'foo bar');
    });

    it('should discard videos with no details', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
            snippet: { position: 42 },
          },
          {
            contentDetails: { videoId: 'bar' },
            snippet: { position: 43 },
          },
        ],
      };
      mockInternal('getVideosData', {
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await module.internals.getVideosFromPlaylistPage(input);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 42);
      expect(actual[0]).toHaveProperty('video.title', 'foo bar');
    });

    it('should warn about videos without data', async () => {
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
      mockInternal('getVideosData', {
        bar: {
          video: { id: 'bar' },
        },
      });

      await module.internals.getVideosFromPlaylistPage(input);

      expect(pulse.emit).toHaveBeenCalledWith('warning', anyString, [
        'https://youtu.be/foo',
      ]);
    });

    it('should warn about videos added several times to the playlist', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
          },
          {
            contentDetails: { videoId: 'foo' },
          },
        ],
      };

      await module.internals.getVideosFromPlaylistPage(input);

      expect(pulse.emit).toHaveBeenCalledWith('warning', anyString, anyString);
    });
  });

  describe('formatCaptions', () => {
    it('hasCaptions should be false if no caption is found', () => {
      const data = {};
      const captions = [];

      const actual = module.internals.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasCaptions', false);
    });

    it('hasCaptions should be true if at least one caption is found', () => {
      const data = {};
      const captions = [{}];

      const actual = module.internals.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasCaptions', true);
    });

    it('hasManualCaptions should be true if contentDetails.caption is set to true', () => {
      const data = {
        contentDetails: {
          caption: 'true',
        },
      };
      const captions = [];

      const actual = module.internals.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', true);
    });

    it('hasManualCaptions should be false if contentDetails.caption is set to false', () => {
      const data = {
        contentDetails: {
          caption: 'false',
        },
      };
      const captions = [];

      const actual = module.internals.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', false);
    });
  });

  describe('formatPopularity', () => {
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

      const actual = module.internals.formatPopularity(data);

      expect(actual).toHaveProperty('comments', 5);
      expect(actual).toHaveProperty('dislikes', 0);
      expect(actual).toHaveProperty('favorites', 0);
      expect(actual).toHaveProperty('likes', 169);
      expect(actual).toHaveProperty('views', 3798);
    });
  });

  describe('formatDuration', () => {
    it('it should convert the duration a .minutes .seconds object', () => {
      const data = {
        contentDetails: {
          duration: 'PT4M25S',
        },
      };

      const actual = module.internals.formatDuration(data);

      expect(actual).toHaveProperty('minutes', 4);
      expect(actual).toHaveProperty('seconds', 25);
    });
  });

  describe('formatChannel', () => {
    it('should contain the id and title', () => {
      const data = {
        snippet: {
          channelId: 'foo',
          channelTitle: 'bar',
        },
      };

      const actual = module.internals.formatChannel(data);

      expect(actual).toHaveProperty('id', 'foo');
      expect(actual).toHaveProperty('title', 'bar');
    });
  });

  describe('formatVideo', () => {
    it('should contain the videoId', () => {
      mockInternal('formatCaptions');
      mockInternal('formatPopularity');
      mockInternal('formatDuration');
      const data = {
        id: 'foo',
      };

      const actual = module.internals.formatVideo(data);

      expect(actual).toHaveProperty('id', 'foo');
    });

    it('should contain base information', () => {
      mockInternal('formatCaptions');
      mockInternal('formatPopularity');
      mockInternal('formatDuration');
      const data = {
        snippet: {
          title: 'Video title',
          description: 'Video description',
          thumbnails: 'thumbnails',
          defaultAudioLanguage: 'en',
        },
      };

      const actual = module.internals.formatVideo(data);

      expect(actual).toHaveProperty('title', 'Video title');
      expect(actual).toHaveProperty('description', 'Video description');
      expect(actual).toHaveProperty('thumbnails', 'thumbnails');
      expect(actual).toHaveProperty('language', 'en');
    });

    it('should contain extended information', () => {
      const data = {};
      mockInternal('formatCaptions', { foo: 'bar' });
      mockInternal('formatPopularity', 'popularity');
      mockInternal('formatDuration', 'duration');

      const actual = module.internals.formatVideo(data);

      expect(actual).toHaveProperty('popularity', 'popularity');
      expect(actual).toHaveProperty('duration', 'duration');
      expect(actual).toHaveProperty('foo', 'bar');
    });

    it('should contain published date as timestamp', () => {
      mockInternal('formatCaptions');
      mockInternal('formatPopularity');
      mockInternal('formatDuration');
      const data = {
        snippet: {
          publishedAt: '2018-03-16T16:04:29.000Z',
        },
      };

      const actual = module.internals.formatVideo(data);

      expect(actual).toHaveProperty('publishedDate', 1521216269);
    });

    it('should contain the video url', () => {
      mockInternal('formatCaptions');
      mockInternal('formatPopularity');
      mockInternal('formatDuration');
      const data = {
        id: 'foo',
      };

      const actual = module.internals.formatVideo(data);

      expect(actual).toHaveProperty(
        'url',
        'https://www.youtube.com/watch?v=foo'
      );
    });
  });

  describe('getVideosData', () => {
    it('calls /videos with only one id', async () => {
      mockInternal('get');
      const input = 'foo';

      await module.internals.getVideosData(input);

      expect(module.internals.get).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo' })
      );
    });

    it('calls /videos with several ids', async () => {
      mockInternal('get');
      const input = ['foo', 'bar'];

      await module.internals.getVideosData(input);

      expect(module.internals.get).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo,bar' })
      );
    });

    it('sets the channel key to each video', async () => {
      mockInternal('formatVideo');
      mockInternal('get', { items: [{ id: 'foo' }] });
      mockInternal('formatChannel', 'channel info');

      const actual = await module.internals.getVideosData();

      expect(actual).toHaveProperty('foo.channel', 'channel info');
    });

    it('sets the video key to each video', async () => {
      mockInternal('formatChannel');
      mockInternal('get', { items: [{ id: 'foo' }] });
      mockInternal('formatVideo', 'video info');

      const actual = await module.internals.getVideosData();

      expect(actual).toHaveProperty('foo.video', 'video info');
    });

    it('sets the .captions key', async () => {
      mockInternal('get', { items: [{ id: 'foo' }] });
      mockInternal('formatDuration');
      mockInternal('getCaptions', 'captions');

      const actual = await module.internals.getVideosData();

      expect(actual).toHaveProperty('foo.captions', 'captions');
    });
  });

  describe('getCaptions', () => {
    it('returns a list of captions', async () => {
      mockInternal('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.499" start="13.28">foo bar</text>
  <text dur="5.25" start="16.02">bar baz</text>
</transcript>
`,
      });

      const actual = await module.internals.getCaptions(42);

      expect(axios.get).toHaveBeenCalledWith('{caption_url}');
      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('start', 13.28);
      expect(actual[0]).toHaveProperty('duration', 5.5);
      expect(actual[0]).toHaveProperty('content', 'foo bar');
      expect(actual[1]).toHaveProperty('content', 'bar baz');
    });

    it('removes HTML from captions', async () => {
      mockInternal('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.25" start="16.02">&lt;font color="#CCCCCC"&gt;foo&lt;/font&gt;&lt;font color="#E5E5E5"&gt; bar&lt;/font&gt;</text>
</transcript>
`,
      });

      const actual = await module.internals.getCaptions(42);

      expect(actual[0]).toHaveProperty('content', 'foo bar');
    });

    it('returns an empty array if no url found', async () => {
      mockInternal('getCaptionsUrl');

      const actual = await module.internals.getCaptions(42);

      expect(actual).toEqual([]);
    });

    it('returns an empty array if no captions', async () => {
      mockInternal('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
</transcript>
`,
      });

      const actual = await module.internals.getCaptions(42);

      expect(actual).toEqual([]);
    });
  });

  /* eslint-disable camelcase */
  describe('getCaptionsUrl', () => {
    it('should get the url from a well formed data tree', async () => {
      mockInternal('getRawVideoInfo', {
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
      });
      const input = 'videoId';

      const actual = await module.internals.getCaptionsUrl(input);

      expect(actual).toEqual('GOOD');
    });

    it('should return undefined if no caption url', async () => {
      mockInternal('getRawVideoInfo', {
        player_response: {
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [],
            },
          },
        },
      });
      const input = 'videoId';

      const actual = await module.internals.getCaptionsUrl(input);

      expect(actual).toEqual(undefined);
    });
  });
  /* eslint-enable camelcase */
});
