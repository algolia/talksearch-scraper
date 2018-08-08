import module from '../fileutils';
import helper from '../test-helper';
const mock = helper.mock(module);

jest.mock('glob');
import glob from 'glob';
jest.mock('fs');
import fs from 'fs';
jest.mock('pify');
import pify from 'pify';

describe('fileutils', () => {
  describe('glob', () => {
    it('is a promise wrapper around glob', async () => {
      module._glob = null;
      const mockGlob = jest.fn().mockReturnValue('foo');
      pify.mockReturnValue(mockGlob);

      const actual = await module.glob('pattern');

      expect(actual).toEqual('foo');
      expect(pify).toHaveBeenCalledWith(glob);
      expect(mockGlob).toHaveBeenCalledWith('pattern');
    });
  });

  describe('read', () => {
    it('is a promise wrapper around fs.readFile', async () => {
      module._readFile = null;
      const mockReadFile = jest.fn().mockReturnValue('foo');
      pify.mockReturnValue(mockReadFile);

      const actual = await module.read('filepath');

      expect(actual).toEqual('foo');
      expect(pify).toHaveBeenCalledWith(fs.readFile);
      expect(mockReadFile).toHaveBeenCalledWith('filepath');
    });
  });

  describe('readJson', () => {
    it('should return null if no such file', async () => {
      mock('read').mockImplementation(() => {
        throw new Error();
      });

      const actual = await module.readJson();

      expect(actual).toEqual(null);
    });

    it('should return null if not a Json file', async () => {
      mock('read', 'foo');

      const actual = await module.readJson();

      expect(actual).toEqual(null);
    });

    it('should parse the JSON content as an object', async () => {
      mock('read', '{"foo": "bar"}');

      const actual = await module.readJson();

      expect(actual).toHaveProperty('foo', 'bar');
    });
  });
});
