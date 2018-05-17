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

async function writeJSON(destination, data) {
  const content = stringify(data, { space: 2 });
  const writing = await write(destination, content);
  return writing;
}

async function read(source) {
  const writing = await readFile(source);
  return writing;
}

async function readJSON(source) {
  const content = await read(source);
  return JSON.parse(content);
}

export { write, writeJSON, read, readJSON };
export default { write, writeJSON, read, readJSON };
