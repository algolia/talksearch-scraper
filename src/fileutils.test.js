/* eslint-disable import/no-commonjs */
import module from './fileutils';
import helper from './test-helper';

describe('fileutils', () => {
  beforeEach(helper.globalBeforeEach);

  describe('readJSON', () => {
    it('should return null if no such file', async () => {
      const input = './file.json';
      helper.mockPrivate(module, 'read').mockImplementation(() => {
        throw new Error();
      });

      const actual = await module.readJSON(input);

      expect(actual).toEqual(null);
    });

    it('should return null if not a JSON file', async () => {
      const input = './file.json';
      helper.mockPrivate(module, 'read', 'foo');

      const actual = await module.readJSON(input);

      expect(actual).toEqual(null);
    });
  });
});
