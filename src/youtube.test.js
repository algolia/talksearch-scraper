import module from './youtube';
jest.mock('./disk-logger');
jest.mock('./fileutils');
jest.mock('axios');
const axios = require('axios');

function mockPrivate(methodName, returnValue = undefined) {
  const mockMethod = jest.fn(() => returnValue);
  module.__RewireAPI__.__Rewire__(methodName, mockMethod);
  return mockMethod;
}

let current;

describe('youtube', () => {
  beforeEach(() => {
    __rewire_reset_all__();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('getVideosFromUrl', () => {
    beforeEach(() => {
      current = module.getVideosFromUrl;
    });

    it('return an empty array if not a parseable url', async () => {
      const url = 'http://www.example.com/';

      const actual = await current(url);

      expect(actual).toEqual([]);
    });

    it('return playlist videos if a playlist is given', async () => {
      const getVideosFromPlaylist = mockPrivate(
        'getVideosFromPlaylist',
        '{allVideos}'
      );

      const input = 'https://www.youtube.com/watch?list=DEADBEEF';
      const actual = await current(input);

      expect(getVideosFromPlaylist).toHaveBeenCalledWith('DEADBEEF');
      expect(actual).toEqual('{allVideos}');
    });
  });

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
      mockPrivate('get', mockValue);

      const actual = await current(playlistId);

      expect(actual).toHaveProperty('id', 42);
      expect(actual).toHaveProperty('title', 'foo');
      expect(actual).toHaveProperty('description', 'bar');
    });
  });

  describe('getVideosFromPlaylist', () => {
    beforeEach(() => {
      current = module.internals.getVideosFromPlaylist;
    });

    it('returns a list of videos with data', async () => {
      // Given
      const playlistId = 42;
      mockPrivate('getPlaylistData', { name: 'playlist_name' });

      const mockGet = mockPrivate('get');
      mockGet.mockReturnValueOnce({
        pageInfo: {
          totalResults: 3,
          increment: 2,
        },
        nextPageToken: 'token',
        items: [
          {
            contentDetails: {
              videoId: 'foo',
            },
            snippet: {
              position: 0,
            },
          },
          {
            contentDetails: {
              videoId: 'bar',
            },
            snippet: {
              position: 1,
            },
          },
        ],
      });
      mockGet.mockReturnValueOnce({
        pageInfo: {
          totalResults: 3,
          increment: 2,
        },
        nextPageToken: null,
        items: [
          {
            contentDetails: {
              videoId: 'baz',
            },
            snippet: {
              position: 2,
            },
          },
        ],
      });

      const mockGetVideoData = mockPrivate('getVideoData');
      mockGetVideoData.mockReturnValueOnce([
        {
          video: {
            id: 'foo',
            name: 'video_name_foo',
          },
        },
        {
          video: {
            id: 'bar',
            name: 'video_name_bar',
          },
        },
      ]);
      mockGetVideoData.mockReturnValueOnce([
        {
          video: {
            id: 'baz',
            name: 'video_name_baz',
          },
        },
      ]);

      // When
      const actual = await current(playlistId);

      // Then
      expect(mockGet).toHaveBeenCalledWith(
        'playlistItems',
        expect.objectContaining({
          pageToken: null,
        })
      );
      expect(mockGet).toHaveBeenLastCalledWith(
        'playlistItems',
        expect.objectContaining({
          pageToken: 'token',
        })
      );
      expect(mockGetVideoData).toHaveBeenCalledWith(['foo', 'bar']);

      expect(actual).toHaveLength(3);
      expect(actual[0]).toHaveProperty('video.id', 'foo');
      expect(actual[0]).toHaveProperty('video.positionInPlaylist', 0);
      expect(actual[0]).toHaveProperty('video.name', 'video_name_foo');
      expect(actual[0]).toHaveProperty('playlist.name', 'playlist_name');
      expect(actual[1]).toHaveProperty('video.id', 'bar');
      expect(actual[1]).toHaveProperty('video.positionInPlaylist', 1);
      expect(actual[1]).toHaveProperty('video.name', 'video_name_bar');
      expect(actual[1]).toHaveProperty('playlist.name', 'playlist_name');
      expect(actual[2]).toHaveProperty('video.id', 'baz');
      expect(actual[2]).toHaveProperty('video.positionInPlaylist', 2);
      expect(actual[2]).toHaveProperty('video.name', 'video_name_baz');
      expect(actual[2]).toHaveProperty('playlist.name', 'playlist_name');
    });
  });

  describe('getCaptions', () => {
    beforeEach(() => {
      current = module.internals.getCaptions;
    });

    it('returns a list of captions', async () => {
      mockPrivate('getCaptionsUrl', '{caption_url}');
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
      expect(actual[0]).toHaveProperty('duration', 5.499);
      expect(actual[0]).toHaveProperty('content', 'foo bar');
      expect(actual[1]).toHaveProperty('content', 'bar baz');
    });

    it('removes HTML from captions', async () => {
      mockPrivate('getCaptionsUrl', '{caption_url}');
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
      mockPrivate('getCaptionsUrl', null);

      const actual = await current(42);

      expect(actual).toEqual([]);
    });

    it('returns an empty array if no captions', async () => {
      mockPrivate('getCaptionsUrl', '{caption_url}');
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
      mockPrivate('getRawVideoInfo', mockValue);
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
      mockPrivate('getRawVideoInfo', mockValue);
      const input = 'videoId';

      const actual = await current(input);

      expect(actual).toEqual(undefined);
    });
  });
  /* eslint-enable camelcase */
});
