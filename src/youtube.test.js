import module from './youtube';

function mockPrivate(methodName, returnValue) {
  module.__RewireAPI__.__Rewire__(methodName, () => returnValue);
}
let current;

describe('youtube', () => {
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
