import module from '../youtube';
import helper from '../test-helper';
const mock = helper.mock(module);

jest.mock('../disk-logger');
jest.mock('../fileutils');

jest.mock('axios');
import axios from 'axios';

jest.mock('../globals');
import globals from '../globals';

jest.mock('../fileutils');
import fileutils from '../fileutils';

jest.mock('../pulse');
import pulse from '../pulse';
pulse.emit = jest.fn();

const objectContaining = expect.objectContaining;
const anyString = expect.any(String);

describe('youtube', () => {
  describe('formatCaptions', () => {
    it('hasCaptions should be false if no caption is found', () => {
      const data = {};
      const captions = [];

      const actual = module.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasCaptions', false);
    });

    it('hasCaptions should be true if at least one caption is found', () => {
      const data = {};
      const captions = [{}];

      const actual = module.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasCaptions', true);
    });

    it('hasManualCaptions should be true if contentDetails.caption is set to true', () => {
      const data = {
        contentDetails: {
          caption: 'true',
        },
      };
      const captions = [];

      const actual = module.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', true);
    });

    it('hasManualCaptions should be false if contentDetails.caption is set to false', () => {
      const data = {
        contentDetails: {
          caption: 'false',
        },
      };
      const captions = [];

      const actual = module.formatCaptions(data, captions);

      expect(actual).toHaveProperty('hasManualCaptions', false);
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

      const actual = module.formatChannel(data);

      expect(actual).toHaveProperty('id', 'foo');
      expect(actual).toHaveProperty('title', 'bar');
    });
  });

  describe('formatDuration', () => {
    it('it should convert the duration a .minutes .seconds object', () => {
      const data = {
        contentDetails: {
          duration: 'PT4M25S',
        },
      };

      const actual = module.formatDuration(data);

      expect(actual).toHaveProperty('minutes', 4);
      expect(actual).toHaveProperty('seconds', 25);
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

      const actual = module.formatPopularity(data);

      expect(actual).toHaveProperty('comments', 5);
      expect(actual).toHaveProperty('dislikes', 0);
      expect(actual).toHaveProperty('favorites', 0);
      expect(actual).toHaveProperty('likes', 169);
      expect(actual).toHaveProperty('views', 3798);
    });
  });

  describe('formatVideo', () => {
    it('should contain the videoId', () => {
      mock('formatCaptions');
      mock('formatPopularity');
      mock('formatDuration');
      const data = {
        id: 'foo',
      };

      const actual = module.formatVideo(data);

      expect(actual).toHaveProperty('id', 'foo');
    });

    it('should contain base information', () => {
      mock('formatCaptions');
      mock('formatPopularity');
      mock('formatDuration');
      const data = {
        snippet: {
          title: 'Video title',
          description: 'Video description',
          thumbnails: 'thumbnails',
        },
      };

      const actual = module.formatVideo(data);

      expect(actual).toHaveProperty('title', 'Video title');
      expect(actual).toHaveProperty('description', 'Video description');
      expect(actual).toHaveProperty('thumbnails', 'thumbnails');
    });

    it('should contain extended information', () => {
      const data = {};
      mock('formatCaptions', { foo: 'bar' });
      mock('formatPopularity', 'popularity');
      mock('formatDuration', 'duration');

      const actual = module.formatVideo(data);

      expect(actual).toHaveProperty('popularity', 'popularity');
      expect(actual).toHaveProperty('duration', 'duration');
      expect(actual).toHaveProperty('foo', 'bar');
    });

    it('should contain published date as timestamp', () => {
      mock('formatCaptions');
      mock('formatPopularity');
      mock('formatDuration');
      const data = {
        snippet: {
          publishedAt: '2018-03-16T16:04:29.000Z',
        },
      };

      const actual = module.formatVideo(data);

      expect(actual).toHaveProperty('publishedDate', 1521216269);
    });

    it('should contain the video url', () => {
      mock('formatCaptions');
      mock('formatPopularity');
      mock('formatDuration');
      const data = {
        id: 'foo',
      };

      const actual = module.formatVideo(data);

      expect(actual).toHaveProperty(
        'url',
        'https://www.youtube.com/watch?v=foo'
      );
    });
  });

  describe('getCaptions', () => {
    it('returns a list of captions', async () => {
      mock('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.499" start="13.28">foo bar</text>
  <text dur="5.25" start="16.02">bar baz</text>
</transcript>
`,
      });

      const actual = await module.getCaptions(42);

      expect(axios.get).toHaveBeenCalledWith('{caption_url}');
      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('start', 13.28);
      expect(actual[0]).toHaveProperty('duration', 5.5);
      expect(actual[0]).toHaveProperty('content', 'foo bar bar baz');

      expect(actual[1]).toHaveProperty('start', 16.02);
      expect(actual[1]).toHaveProperty('duration', 5.25);
      expect(actual[1]).toHaveProperty('content', 'bar baz');
    });

    it('removes HTML from captions', async () => {
      mock('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text dur="5.25" start="16.02">&lt;font color="#CCCCCC"&gt;foo&lt;/font&gt;&lt;font color="#E5E5E5"&gt; bar&lt;/font&gt;</text>
</transcript>
`,
      });

      const actual = await module.getCaptions(42);

      expect(actual[0]).toHaveProperty('content', 'foo bar');
    });

    it('returns an empty array if no url found', async () => {
      mock('getCaptionsUrl');

      const actual = await module.getCaptions(42);

      expect(actual).toEqual([]);
    });

    it('returns an empty array if no captions', async () => {
      mock('getCaptionsUrl', '{caption_url}');
      jest.spyOn(axios, 'get').mockReturnValue({
        data: `<?xml version="1.0" encoding="utf-8"?>
<transcript>
</transcript>
`,
      });

      const actual = await module.getCaptions(42);

      expect(actual).toEqual([]);
    });
  });

  /* eslint-disable camelcase */
  describe('getCaptionsUrl', () => {
    it('should prefer the manual captions ', async () => {
      mock('getRawVideoInfo', {
        player_response: {
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [
                { baseUrl: 'BAD', kind: 'asr' },
                { baseUrl: 'GOOD' },
                { baseUrl: 'BAD' },
              ],
            },
          },
        },
      });

      const actual = await module.getCaptionsUrl('anything');

      expect(actual).toEqual('GOOD');
    });

    it('should return false if no captionTracks', async () => {
      mock('getRawVideoInfo', {
        player_response: {
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [],
            },
          },
        },
      });

      const actual = await module.getCaptionsUrl();

      expect(actual).toEqual(false);
    });
  });
  /* eslint-enable camelcase */

  describe('getPlaylistData', () => {
    it('return an object with playlist data', async () => {
      const playlistId = 42;
      mock('get', {
        items: [
          {
            snippet: {
              title: 'foo',
              description: 'bar',
            },
          },
        ],
      });

      const actual = await module.getPlaylistData(playlistId);

      expect(actual).toHaveProperty('id', 42);
      expect(actual).toHaveProperty('title', 'foo');
      expect(actual).toHaveProperty('description', 'bar');
    });
  });

  describe('getVideos', () => {
    beforeEach(() => {
      globals.readFromCache.mockReturnValue(false);
      globals.config.mockReturnValue({});
    });

    it('should get videos from API by default', async () => {
      mock('getVideosFromApi', 'videos_from_api');

      const actual = await module.getVideos();

      expect(actual).toEqual('videos_from_api');
    });

    it('should get videos from cache if enabled', async () => {
      globals.readFromCache.mockReturnValue(true);
      mock('getVideosFromCache', 'cached_videos');

      const actual = await module.getVideos();

      expect(actual).toEqual('cached_videos');
    });

    it('should emit a youtube:video event with the videos', async () => {
      mock('getVideosFromApi', 'video_list');

      await module.getVideos();

      expect(pulse.emit).toHaveBeenCalledWith('youtube:videos', {
        videos: 'video_list',
      });
    });
  });

  describe('getVideosData', () => {
    it('calls /videos with only one id', async () => {
      mock('get');
      const input = 'foo';

      await module.getVideosData(input);

      expect(module.get).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo' })
      );
    });

    it('calls /videos with several ids', async () => {
      mock('get');
      const input = ['foo', 'bar'];

      await module.getVideosData(input);

      expect(module.get).toHaveBeenCalledWith(
        'videos',
        objectContaining({ id: 'foo,bar' })
      );
    });

    it('sets the channel key to each video', async () => {
      mock('formatVideo');
      mock('get', { items: [{ id: 'foo' }] });
      mock('formatChannel', 'channel info');

      const actual = await module.getVideosData();

      expect(actual).toHaveProperty('foo.channel', 'channel info');
    });

    it('sets the video key to each video', async () => {
      mock('formatChannel');
      mock('get', { items: [{ id: 'foo' }] });
      mock('formatVideo', 'video info');

      const actual = await module.getVideosData();

      expect(actual).toHaveProperty('foo.video', 'video info');
    });

    it('sets the .captions key', async () => {
      mock('get', { items: [{ id: 'foo' }] });
      mock('formatDuration');
      mock('getCaptions', 'captions');

      const actual = await module.getVideosData();

      expect(actual).toHaveProperty('foo.captions', 'captions');
    });
  });

  describe('getVideosFromCache', () => {
    it('should return all videos from one playlist', async () => {
      globals.configName.mockReturnValue('my_config');
      globals.config.mockReturnValue({ playlists: ['foo'] });
      fileutils.glob.mockReturnValue(['cache_file']);
      fileutils.readJson.mockReturnValue([{ video: 'video_from_cache' }]);

      const actual = await module.getVideosFromCache();

      expect(actual).toEqual([{ video: 'video_from_cache' }]);
      expect(fileutils.glob).toHaveBeenCalledWith(
        './cache/my_config/youtube/foo.json'
      );
    });

    it('should return all videos from several playlists', async () => {
      globals.configName.mockReturnValue('my_config');
      globals.config.mockReturnValue({ playlists: ['foo', 'bar'] });
      fileutils.glob.mockReturnValue(['cache_file1', 'cache_file2']);
      fileutils.readJson.mockReturnValueOnce([{ video: 'video_from_cache1' }]);
      fileutils.readJson.mockReturnValueOnce([{ video: 'video_from_cache2' }]);

      const actual = await module.getVideosFromCache();

      expect(actual).toEqual([
        { video: 'video_from_cache1' },
        { video: 'video_from_cache2' },
      ]);
    });

    it('should exclude videos from the blockList', async () => {
      globals.config.mockReturnValue({
        playlists: ['playlistId'],
        blockList: ['bar'],
      });
      fileutils.glob.mockReturnValue(['glob_path']);
      fileutils.readJson.mockReturnValue([
        { video: { id: 'foo' } },
        { video: { id: 'bar' } },
      ]);

      const actual = await module.getVideosFromCache();

      expect(actual).toEqual([{ video: { id: 'foo' } }]);
    });
  });

  describe('getVideosFromPlaylist', () => {
    it('should get all videos from the unique page', async () => {
      mock('getPlaylistData', { nextPageToken: null });
      mock('getVideosFromPlaylistPage', [{ foo: 'bar' }, { bar: 'baz' }]);

      const actual = await module.getVideosFromPlaylist();

      expect(actual).toHaveLength(2);
      expect(actual[0]).toHaveProperty('foo', 'bar');
      expect(actual[1]).toHaveProperty('bar', 'baz');
    });

    it('should get all videos from several pages', async () => {
      mock('getPlaylistData');
      mock('get')
        .mockReturnValueOnce({ nextPageToken: 'token' })
        .mockReturnValueOnce({ nextPageToken: null });
      mock('getVideosFromPlaylistPage')
        .mockReturnValueOnce([{ key: 'foo' }, { key: 'bar' }])
        .mockReturnValueOnce([{ key: 'baz' }]);

      const actual = await module.getVideosFromPlaylist();

      expect(actual[0]).toHaveProperty('key', 'foo');
      expect(actual[1]).toHaveProperty('key', 'bar');
      expect(actual[2]).toHaveProperty('key', 'baz');
    });

    it('should add the playlist data to each item', async () => {
      mock('getPlaylistData', 'playlistData');
      mock('get', { nextPageToken: null });
      mock('getVideosFromPlaylistPage', [{ foo: 'bar' }, { bar: 'baz' }]);

      const actual = await module.getVideosFromPlaylist();

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
      mock('getVideosData', {
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await module.getVideosFromPlaylistPage(input);

      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 42);
      expect(actual[0]).toHaveProperty('video.title', 'foo bar');
    });

    it('should discard videos excluded by blockList', async () => {
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
      mock('getVideosData', {
        foo: {
          video: { id: 'bar', title: 'foo bar' },
        },
      });
      globals.config.mockReturnValue({ blockList: ['foo'] });

      const actual = await module.getVideosFromPlaylistPage(input);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toHaveProperty('video.id', 'bar');
    });

    it('should not discard videos if no blocklist', async () => {
      const input = {
        items: [
          {
            contentDetails: { videoId: 'foo' },
            snippet: { position: 42 },
          },
        ],
      };
      mock('getVideosData', {
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });
      globals.config.mockReturnValue({ blockList: null });

      const actual = await module.getVideosFromPlaylistPage(input);

      expect(actual).toHaveLength(1);
      expect(actual[0]).toHaveProperty('video.id', 'foo');
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
      mock('getVideosData', {
        foo: {
          video: { id: 'foo', title: 'foo bar' },
        },
      });

      const actual = await module.getVideosFromPlaylistPage(input);

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
      mock('getVideosData', {
        bar: {
          video: { id: 'bar' },
        },
      });

      await module.getVideosFromPlaylistPage(input);

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

      await module.getVideosFromPlaylistPage(input);

      expect(pulse.emit).toHaveBeenCalledWith('warning', anyString, anyString);
    });
  });
});
