/* eslint-disable import/no-commonjs */
import module from './fileutils';
import helper from './test-helper';

describe('fileutils', () => {
  beforeEach(helper.globalBeforeEach);

  describe('readJson', () => {
    it('should return null if no such file', async () => {
      const input = './file.json';
      helper.mockPrivate(module, 'read').mockImplementation(() => {
        throw new Error();
      });

      const actual = await module.readJson(input);

      expect(actual).toEqual(null);
    });

    it('should return null if not a Json file', async () => {
      const input = './file.json';
      helper.mockPrivate(module, 'read', 'foo');

      const actual = await module.readJson(input);

      expect(actual).toEqual(null);
    });
  });
});
