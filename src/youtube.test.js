import module from './youtube.js';
jest.mock('axios');
const axios = require('axios');

describe('youtube', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  describe('getCaptions', () => {
    // let mockSearch;
    // beforeEach(() => {
    //   mockSearch = jest.fn().mockReturnValue(Promise.resolve());
    //   jest
    //     .spyOn(module, 'init')
    //     .mockReturnValue(
    //       Promise.resolve({
    //         search: mockSearch,
    //       })
    //     );
    // });
    it('should return [] if no captions found', () => {
      // // Given
      // const input = 'London, UK';

      // // When
      // const actual = module.getCityCoordinates(input);

      // // Then
      // return actual.catch(() => {
      //   expect(mockSearch).toHaveBeenCalledWith(input, expect.objectContaining({
      //       type: 'city',
      //     }));
      // });
    });
  });
});
