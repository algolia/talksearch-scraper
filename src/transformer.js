import _ from 'lodash';
import dayjs from 'dayjs';
import globals from './globals';
import nodeObjectHash from 'node-object-hash';
import configHelper from './config-helper';
import language from '../src/language';

/**
 * Compute a value for ranking based on the various popularity metrics.
 * So far, it's an easy sum of all interactions (like/dislike/views/comments,
 * etc).
 * @param {Object} videoData Object of all interactions
 * @return {Number} Popularity score
 **/
function getPopularityScore(videoData) {
  if (!_.has(videoData, 'popularity')) {
    return 0;
  }
  return _.sum(_.values(_.get(videoData, 'popularity')));
}

/**
 * Return an object representation of the date, with timestamp values capped at
 * the start of the day, month and year. This will be used to limit ties in the
 * custom ranking
 * @param {Number} timestamp The exact timestamp
 * @returns {Object} An object of capped timestamps
 **/
function getBucketedDate(timestamp) {
  const date = dayjs(timestamp * 1000);
  const yearGranularity = date.startOf('year');
  const monthGranularity = date.startOf('month');
  const dayGranularity = date.startOf('day');

  return {
    year: yearGranularity.unix(),
    month: monthGranularity.unix(),
    day: dayGranularity.unix(),
    timestamp: date.unix(),
  };
}

/**
 * Return a url to go to the specific time in the video
 * @param {String} videoId Video id
 * @param {Number} start Start time, in seconds
 * @returns {String} Url pointing to the specific time in the video
 **/
function getCaptionUrl(videoId, start) {
  let url = `https://www.youtube.com/watch?v=${videoId}`;
  if (start > 0) {
    url = `${url}&t=${start}s`;
  }
  return url;
}

/**
 * Return an object representing a caption
 * @param {String} userCaption Caption string
 * @param {Number} position Position index in the list of all captions
 * @param {String} videoId The YouUbe videoId
 * @returns {Object} An object representing a caption
 **/
function getCaptionDetails(userCaption, position, videoId) {
  let caption = userCaption;
  // Always adding a caption, even if empty, it makes the front-end logic easier
  // to handle
  if (!caption) {
    caption = {
      content: null,
      duration: 0,
      start: 0,
    };
  }

  const content = caption.content;
  const duration = _.round(caption.duration, 2);
  const start = _.floor(caption.start);
  const url = getCaptionUrl(videoId, start);

  return {
    content,
    duration,
    start,
    position,
    url,
  };
}

/**
 * Returns an array of record from a video
 * @param {Object} video The video object
 * @returns {Array} An array of all records for this video, one per caption
 **/
function recordsFromVideo(video) {
  const hashObject = nodeObjectHash().hash;

  // Enhanced video data
  const videoDetails = { ...video.video };
  _.set(videoDetails, 'popularity.score', getPopularityScore(videoDetails));
  _.set(
    videoDetails,
    'publishedDate',
    getBucketedDate(videoDetails.publishedDate)
  );

  // Base record metadata to add to all records
  let baseRecord = {
    video: videoDetails,
    playlist: video.playlist,
    channel: video.channel,
    speakers: video.speakers,
    conference: video.conference,
  };

  // Config specific updates
  const config = globals.config();
  if (_.get(config, 'transformData')) {
    baseRecord = config.transformData(baseRecord, configHelper);
  }

  // One record per caption, with a minimum of 1 even if no captions
  let captions = _.get(video, 'captions');
  if (_.isEmpty(captions)) {
    captions = [undefined];
  }

  return _.map(captions, (caption, position) => {
    const videoId = baseRecord.video.id;
    const captionDetails = getCaptionDetails(caption, position, videoId);
    const record = {
      ...baseRecord,
      caption: captionDetails,
    };

    record.objectID = hashObject(record);
    return record;
  });
}

/**
 * Guess the conference year based on the playlist name
 * @param {Object} video The video object
 * @returns {Number} The conference year
 **/
function guessConferenceYear(video) {
  const playlistTitle = _.get(video, 'playlist.title', null);
  if (!playlistTitle) {
    return null;
  }
  const matches = playlistTitle.match(/[0-9]{4}/);
  if (!matches) {
    return null;
  }
  return _.parseInt(matches);
}

/**
 * Enrich the raw video data as extracted from YouTube with some guess about
 * other fields
 * @param {Array} inputVideos List of raw videos
 * @returns {Array} The enriched list of videos
 * Note that this will create .conference and .speakers keys to the object
 **/
async function enrichVideos(inputVideos) {
  // Extract speakers from text analysis of the title
  let videos = await language.enrichVideos(inputVideos);

  // Guessing conference year
  videos = _.map(videos, video => ({
    ...video,
    conference: {
      year: guessConferenceYear(video),
    },
  }));

  return videos;
}

const Transformer = {
  async run(inputVideos) {
    // Enrich videos
    const videos = await enrichVideos(inputVideos);

    // Convert videos to records
    const records = _.flatten(_.map(videos, recordsFromVideo));

    return records;
  },

  internals: {
    getBucketedDate,
    getCaptionUrl,
    getPopularityScore,
    getCaptionDetails,
    guessConferenceYear,
    enrichVideos,
    recordsFromVideo,
  },
};

export default Transformer;
