import algoliasearch from 'algoliasearch';

import {
  getChannelID,
  getChannelAvatar,
  getPlaylistID,
  getVideo,
  recursiveGetVideosList,
} from './youtube';

import { indexVideos, indexMetadata } from './algolia';

const client = algoliasearch(process.env.APP_ID, process.env.API_KEY);

async function getYoutubeChannel(channelId, customIndexName) {
  const playlistId = await getPlaylistID(channelId);
  const videos = await recursiveGetVideosList(channelId, playlistId);
  return { videos, indexName: videos[0].channel };
}

async function getYoutubeVideo(videoId, customIndexName) {
  const video = await getVideo(videoId);
  return {
    videos: [video],
    indexName: `${video.channel}-video-${video.id}`,
  };
}

async function getYoutubePlaylist(playlistId, customIndexName) {
  const videos = await recursiveGetVideosList(null, playlistId);

  function resolveIndexName() {
    if (customIndexName.length > 0) {
      return customIndexName
    } else {
      return `${videos[0].channel}-playlist-${playlistId}`
    }
  }

  return {
    videos,
    indexName: resolveIndexName(),
  };
}

function validURL(url) {
  return url.match(/youtube\.com/) !== null;
}

async function recognizeURL(url) {
  let func;
  let id;
  if (url.match(/\?v=/)) {
    func = 'Video';
    id = url.replace(/.*v=([^&]+).*/, '$1');
  } else if (url.match(/\?list=/)) {
    func = 'Playlist';
    id = url.replace(/.*list=([^&]+).*/, '$1');
  } else if (url.match(/channel/)) {
    func = 'Channel';
    id = url.replace(/.*channel\/([^/]+).*/, '$1');
  } else if (url.match(/user/)) {
    func = 'Channel';
    const channelName = url.replace(/.*user\/([^/]+).*/, '$1');
    id = await getChannelID(channelName);
  }

  if (!id) {
    return { func: 'None' };
  }

  return { func, id };
}

function extract(video, regexObj) {
  return video.title.replace(
    new RegExp(regexObj.regex),
    `$${regexObj.nbSubStr}`
  );
}

function extractSpeakerAndTitle(videos, speaker, title) {
  for (const video of videos) {
    if (speaker && speaker.extract) {
      if (speaker.regex) {
        video.speaker = extract(video, speaker);
      } else {
        video.speaker = video.title.split(' - ')[1];
      }
    }
    if (title && title.extract && title.regex) {
      video.title = extract(video, title);
    }
  }
}

function getValidIndexName(indexName) {
  return indexName
    .replace(/[?&/]/g, '')
    .split(' ')
    .join('-');
}

export async function index(req, res) {
  const { body: { youtubeURL, speaker, title, name, accentColor, lang, customIndexName, checkForDuplicates } } = req;

  if (!validURL(youtubeURL)) {
    return res.send({
      success: false,
      message: 'The URL is not a valid YouTube URL.',
    });
  }

  const data = await recognizeURL(youtubeURL);
  if (data.func === 'None') {
    return res.send({
      success: false,
      message: 'The URL does not match a YouTube channel, playlist nor video.',
    });
  }


  // Call getYoutube<Channel|Playlist|Video>
  let { videos, indexName } = await eval(
    `getYoutube${data.func}('${data.id}', '${customIndexName}')`
  ).catch(reason => {
    console.log(reason);
  });

  indexName = getValidIndexName(indexName);

  extractSpeakerAndTitle(videos, speaker, title);

  const metadata = {
    objectID: indexName,
    youtubeURL,
    name,
    speaker,
    title,
    lang,
    avatar: await getChannelAvatar(videos[0].channelId),
  };
  if (accentColor) {
    metadata.accentColor = accentColor;
  }
  indexMetadata(metadata);

  const report = await indexVideos(videos, indexName, lang ? lang : 'en');
  return res.send({
    success: true,
    ...report,
  });
}

function getAllMetadata(indexName) {
  return new Promise((resolve, reject) => {
    const metadataIndex = client.initIndex('METADATA');
    if (indexName) {
      metadataIndex.getObject(indexName, (err, content) => {
        if (err) {
          throw err;
        }
        resolve([content]);
      });
    } else {
      const browser = metadataIndex.browseAll();
      let metadataHits = [];
      browser.on('result', content => {
        metadataHits = metadataHits.concat(content.hits);
      });
      browser.on('end', () => resolve(metadataHits));
    }
  });
}

function clearIndexByIndexName(indexNameToClear, indexName) {
  return new Promise((resolve, reject) => {
    let hits = [];
    const indexToClear = client.initIndex(indexNameToClear);
    indexToClear.browse(
      '',
      { filters: `indexName:${indexName}` },
      function browseDone(err, content) {
        if (err) {
          throw err;
        }
        hits = hits.concat(content.hits);
        if (content.cursor) {
          indexToClear.browseFrom(content.cursor, browseDone);
        } else {
          indexToClear.deleteObjects(hits.map(hit => hit.objectID), () => {
            resolve();
          });
        }
      }
    );
  });
}

async function clearIndicesByIndexName(indices, indexName) {
  for (const indexNameToClear of indices) {
    await clearIndexByIndexName(indexNameToClear, indexName);
  }
}

async function clearIndices(indexNames) {
  for (const indexName of indexNames) {
    const indexToClear = client.initIndex(indexName);
    await indexToClear.clearIndex();
  }
}

export async function reindex(req, res) {
  const { body: { indexName } } = req;
  const indicesToClear = ['ALL_VIDEOS', 'REPORTS'];
  if (indexName) {
    await clearIndicesByIndexName(indicesToClear, indexName);
  } else {
    await clearIndices(indicesToClear);
  }
  const reports = [];
  const metadataHits = await getAllMetadata(indexName);
  for (const hit of metadataHits) {
    await index({ body: hit }, { send: report => reports.push(report) });
  }
  return res.send(reports);
}
