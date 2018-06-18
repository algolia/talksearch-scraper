import stringify from 'json-stable-stringify';
import fs from 'fs';
import path from 'path';
import mkdirpCallback from 'mkdirp';
import Promise from 'bluebird';

const writeFile = Promise.promisify(fs.writeFile);
const readFile = Promise.promisify(fs.readFile);
const mkdirp = Promise.promisify(mkdirpCallback);

async function write(destination, content) {
  await mkdirp(path.dirname(destination));
  const writing = await writeFile(destination, content);
  return writing;
}

async function writeJson(destination, data) {
  const content = stringify(data, { space: 2 });
  const writing = await write(destination, content);
  return writing;
}

async function read(source) {
  const writing = await readFile(source);
  return writing;
}

/**
 * Read a Json file on disk and return its parsed content.
 * @param {String} source Path to the Json file
 * @return {Promise.<Object>} The parsed content of the Json file
 * Will return null if the file does not exist or is not Json
 **/
async function readJson(source) {
  try {
    const content = await read(source);
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

export { write, writeJson, read, readJson };
export default { write, writeJson, read, readJson };
