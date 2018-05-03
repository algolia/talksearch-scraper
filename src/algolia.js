import stringify from 'json-stable-stringify';
import fs from 'fs';
import Promise from 'bluebird';

const writeFile = Promise.promisify(fs.writeFile);

async function writeToCache(path, data) {
  const content = stringify(data, { space: 2 });
  const writing = await writeFile(`./cache/${path}`, content);
  return writing;
}

export { writeToCache };
export default { writeToCache };
