import stringify from 'json-stable-stringify';
import fs from 'fs';
import mkdirpCallback from 'mkdirp';
import Promise from 'bluebird';

const writeFile = Promise.promisify(fs.writeFile);
const mkdirp = Promise.promisify(mkdirpCallback);

async function writeToCache(data) {
  const channelId = data[0].channel.id;
  const playlistId = data[0].playlist.id;
  const dirname = `./cache/${channelId}`;
  const path = `${dirname}/${playlistId}.json`;

  await mkdirp(dirname);
  const content = stringify(data, { space: 2 });
  const writing = await writeFile(path, content);
  return writing;
}

export { writeToCache };
export default { writeToCache };
