import fileutils from './fileutils';

async function writeToCache(data) {
  const channelId = data[0].channel.id;
  const playlistId = data[0].playlist.id;
  const dirname = `./cache/${channelId}`;
  const path = `${dirname}/${playlistId}.json`;

  const writing = await fileutils.writeJSON(path, data);
  return writing;
}

export { writeToCache };
export default { writeToCache };
