import axios from 'axios';
import cheerio from 'cheerio';
import dayjs from 'dayjs';
import diskLogger from './disk-logger';
import fileutils from './fileutils';
import globals from './globals';
import pMap from 'p-map';
import parseIsoDuration from 'parse-iso-duration';
import pulse from './pulse';
import qs from 'query-string';
import _ from 'lodash';
import { forEach, map } from 'p-iteration';

const module = {
  /**
   * Call a Youtube API endpoint with GET parameters
   *
   * @param {String} endpoint The /endpoint to call
   * @param {Object} params The parameters to pass
   * @returns {Promise.<Object>} The data returned by the call
   **/
  async get(endpoint, params) {
    try {
      const options = {
        baseURL: 'https://www.googleapis.com/youtube/v3',
        url: endpoint,
        params: {
          key: globals.youtubeApiKey(),
          ...params,
        },
      };
      const results = await axios(options);
      return results.data;
    } catch (err) {
      pulse.emit('error', err, `get/${endpoint}/${JSON.stringify(params)}`);
      return {};
    }
  },
  /**
   * Return details about a specific playlist
   *
   * @param {String} playlistId The playlist id
   * @returns {Promise.<Object>} The playlist data
   **/
  async getPlaylistData(playlistId) {
    try {
      const response = await this.get('playlists', {
        id: playlistId,
        part: 'snippet',
      });
      diskLogger.write(`playlist/${playlistId}.json`, response);

      const playlistData = response.items[0];
      return {
        id: playlistId,
        title: playlistData.snippet.title,
        description: playlistData.snippet.description,
      };
    } catch (err) {
      pulse.emit('error', err, `getPlaylistData(${playlistId})`);
      return {};
    }
  },
  /**
   * Returns a list of all videos from a specific playlist
   *
   * @param {String} playlistId The id of the playlist
   * @returns {Promise.<Array>} A list of all videos in a playlist
   *
   * It can only get up to 50 videos per page in one call. It will browse all
   * pages to get all videos.
   **/
  async getVideosFromPlaylist(playlistId) {
    try {
      const resultsPerPage = 50;
      const playlistData = await this.getPlaylistData(playlistId);
      let pageToken = null;
      let videos = [];
      let page = 1;
      do {
        // Get list of all videos in the playlist
        const pageItems = await this.get('playlistItems', {
          playlistId,
          maxResults: resultsPerPage,
          pageToken,
          part: 'snippet,contentDetails',
        });

        diskLogger.write(
          `playlistItems/${playlistId}-page-${page}.json`,
          pageItems
        );
        if (page === 1) {
          pulse.emit('playlist:start', {
            playlistId,
            totalVideoCount: _.get(pageItems, 'pageInfo.totalResults'),
          });
        }

        const pageVideos = await this.getVideosFromPlaylistPage(pageItems);
        pulse.emit('playlist:chunk', {
          playlistId,
          chunkVideoCount: pageVideos.length,
        });
        videos = _.concat(videos, pageVideos);

        pageToken = pageItems.nextPageToken;
        page++;
      } while (pageToken);

      // Adding playlist information to all videos
      videos = _.map(videos, video => ({
        ...video,
        playlist: playlistData,
      }));

      pulse.emit('playlist:end', { videos });

      return videos;
    } catch (err) {
      pulse.emit('error', err, `getVideosFromPlaylist(${playlistId})`);
      return [];
    }
  },
  /**
   * Given a playlist page, returns the list of videos of this page, along with
   * their details
   * @param {Object} pageResults The playlist page, as returned by the
   *  /playlistItems endpoint
   * @returns {Promise.<Array>} An array of all videos, along with details
   *
   * Note that some videos returned by the playlistItems might be private. In that
   * case, we won't get any additional data for those videos, so we'll remove them
   * from the returned videos.
   **/
  async getVideosFromPlaylistPage(pageResults) {
    // Page results will give us the videoId and matching position in playlist
    const allVideoInfoFromPage = {};
    const blockList = _.get(globals.config(), 'blockList', []);
    _.each(pageResults.items, video => {
      const videoId = _.get(video, 'contentDetails.videoId');
      // Skipping videos that should be excluded
      if (_.includes(blockList, videoId)) {
        return;
      }

      const positionInPlaylist = _.get(video, 'snippet.position');

      // Some videos are sometimes set several times in the same playlist page,
      // resulting in final count being wrong
      if (allVideoInfoFromPage[videoId]) {
        const initialPosition =
          allVideoInfoFromPage[videoId].video.positionInPlaylist;
        const newPosition = positionInPlaylist;
        pulse.emit(
          'warning',
          'Some videos are added several times to the same playlist',
          `https://youtu.be/${videoId} at position ${initialPosition} and ${newPosition}`
        );
      }

      allVideoInfoFromPage[videoId] = {
        video: {
          id: videoId,
          positionInPlaylist,
        },
      };
    });

    // We also need more detailed information about each video
    const videoPageIds = _.keys(allVideoInfoFromPage);
    const videoDetails = await this.getVideosData(videoPageIds);

    // If we don't have all the details for all video, we issue a warning
    const videoDetailsIds = _.keys(videoDetails);
    if (videoDetailsIds.length !== videoPageIds.length) {
      const excludedIds = _.difference(videoPageIds, videoDetailsIds);
      pulse.emit(
        'warning',
        'Unable to get details for the following videos',
        _.map(excludedIds, id => `https://youtu.be/${id}`)
      );
    }

    // Discarding videos where we don't have any data and merging together
    const selectedVideoInfoFromPage = _.pick(
      allVideoInfoFromPage,
      videoDetailsIds
    );
    const newVideos = _.values(
      _.merge(videoDetails, selectedVideoInfoFromPage)
    );

    return newVideos;
  },
  /**
   * Returns details about specific videos
   *
   * @param {Array.<String>} userVideoId The array of ids of the
   * video to get data from
   * @returns {Promise.<Object>} An object where each key is a video id and each
   * value its detailed information
   **/
  async getVideosData(userVideoId) {
    try {
      const parts = ['contentDetails', 'snippet', 'statistics', 'status'].join(
        ','
      );
      let videoIds = userVideoId;
      if (!_.isArray(videoIds)) {
        videoIds = [videoIds];
      }

      const response = await this.get('videos', {
        id: videoIds.join(','),
        part: parts,
      });
      diskLogger.write(
        `videos/${_.first(videoIds)}-to-${_.last(videoIds)}.json`,
        response
      );

      const items = _.get(response, 'items', []);
      const videoData = {};
      await pMap(items, async data => {
        const videoId = data.id;
        const captions = await this.getCaptions(videoId);

        const channelMetadata = this.formatChannel(data);
        const videoMetadata = this.formatVideo(data, captions);

        videoData[videoId] = {
          channel: channelMetadata,
          video: videoMetadata,
          captions,
        };
      });

      return videoData;
    } catch (err) {
      pulse.emit('error', err, `getVideosData(${userVideoId})`);
      return {};
    }
  },

  async getVideosFromCache() {
    const config = globals.config();
    const configName = globals.configName();
    const playlists = config.playlists;
    const blockList = config.blockList;

    const playlistGlob =
      playlists.length === 1
        ? `${playlists[0]}.json`
        : `{${playlists.join(',')}}.json`;

    const playlistFiles = await fileutils.glob(
      `./cache/${configName}/youtube/${playlistGlob}`
    );
    let videos = _.flatten(await map(playlistFiles, fileutils.readJson));

    // Remove videos that are part of the blocklist
    if (blockList) {
      videos = _.reject(videos, video =>
        _.includes(blockList, _.get(video, 'video.id'))
      );
    }

    return videos;
  },

  async getVideosFromApi() {
    const config = globals.config();
    const configName = globals.configName();
    const playlists = config.playlists;

    pulse.emit('youtube:crawling:start', { playlists });

    const allVideos = [];
    await forEach(playlists, async playlistId => {
      const videos = await this.getVideosFromPlaylist(playlistId);

      await fileutils.writeJson(
        `./cache/${configName}/youtube/${playlistId}.json`,
        videos
      );

      allVideos.push(videos);
    });

    pulse.emit('youtube:crawling:end');
    return _.flatten(allVideos);
  },

  /**
   * Extract hasCaptions and hasManualCaptions from the data received from the
   * API.
   * @param {Object} data Video data object as received by the API
   * @param {Array} captions The array of captions
   * @return {Object} Object containing boolean keys .hasCaptions and
   * .hasManualCaptions
   **/
  formatCaptions(data, captions) {
    const hasCaptions = captions.length > 0;
    const hasManualCaptions = _.get(data, 'contentDetails.caption') === 'true';
    return { hasCaptions, hasManualCaptions };
  },

  /**
   * Format the statistics as returned by the API into an object
   * @param {Object} data Video data object as received by the API
   * @return {Object} Object containing .views, .likes, .dislikes, .favorites,
   * .comments counts as numbers
   **/
  formatPopularity(data) {
    const viewCount = _.parseInt(_.get(data, 'statistics.viewCount'));
    const likeCount = _.parseInt(_.get(data, 'statistics.likeCount'));
    const dislikeCount = _.parseInt(_.get(data, 'statistics.dislikeCount'));
    const favoriteCount = _.parseInt(_.get(data, 'statistics.favoriteCount'));
    const commentCount = _.parseInt(_.get(data, 'statistics.commentCount'));
    return {
      views: viewCount,
      likes: likeCount,
      dislikes: dislikeCount,
      favorites: favoriteCount,
      comments: commentCount,
    };
  },

  /**
   * Format the duration as returned by the API into an object
   * @param {Object} data Video data object as received by the API
   * @return {Object} Object containing a .minutes and .seconds keys
   **/
  formatDuration(data) {
    const durationInSeconds =
      parseIsoDuration(_.get(data, 'contentDetails.duration')) / 1000;
    return {
      minutes: Math.floor(durationInSeconds / 60),
      seconds: durationInSeconds % 60,
    };
  },

  formatChannel(data) {
    return {
      id: _.get(data, 'snippet.channelId'),
      title: _.get(data, 'snippet.channelTitle'),
    };
  },

  formatVideo(data, captions) {
    const videoId = data.id;
    const captionsMetadata = this.formatCaptions(data, captions);
    const popularity = this.formatPopularity(data);
    const duration = this.formatDuration(data);
    const publishedDate = dayjs(_.get(data, 'snippet.publishedAt')).unix();
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      id: videoId,
      title: _.get(data, 'snippet.title'),
      description: _.get(data, 'snippet.description'),
      thumbnails: _.get(data, 'snippet.thumbnails'),
      publishedDate,
      popularity,
      duration,
      url,
      ...captionsMetadata,
    };
  },

  /**
   * Get raw information about a YouTube video.
   *
   * @param {String} videoId Id of the video
   * @returns {Object} Raw data about the video
   *
   * Note: This call does not use the API,but a rather obscure, undocumented,
   * endpoint. The data returned itself is in a variety of formats that has to be
   * parsed to make a cohesive object.
   * TOTEST
   **/
  async getRawVideoInfo(videoId) {
    /* eslint-disable camelcase */
    try {
      const options = {
        url: 'http://www.youtube.com/get_video_info',
        params: {
          video_id: videoId,
        },
      };

      const results = await axios(options);
      diskLogger.write(`get_video_info/${videoId}.txt`, results.data);

      const params = qs.parse(results.data);
      params.adaptive_fmts = qs.parse(params.adaptive_fmts);
      params.atc = qs.parse(params.atc);
      params.fflags = qs.parse(params.fflags);
      params.player_response = JSON.parse(params.player_response);
      params.url_encoded_fmt_stream_map = qs.parse(
        params.url_encoded_fmt_stream_map
      );
      diskLogger.write(`get_video_info/${videoId}.json`, params);
      return params;
    } catch (err) {
      pulse.emit('error', err, `getRawVideoInfo/${videoId}`);
      return {};
    }
    /* eslint-enable camelcase */
  },

  /**
   * Get the caption url for a given videoId
   *
   * @param {String} videoId Id of the video
   * @returns {String} Url to get the video caption file
   **/
  async getCaptionsUrl(videoId) {
    try {
      const rawData = await this.getRawVideoInfo(videoId);
      const captionList = _.get(
        rawData,
        'player_response.captions.playerCaptionsTracklistRenderer.captionTracks'
      );

      // No captions
      if (_.isEmpty(captionList)) {
        return false;
      }

      // Try to get one that is not Automatic Speech Recognition
      const manualCaptions = _.reject(
        captionList,
        caption => _.get(caption, 'kind') === 'asr'
      );
      if (!_.isEmpty(manualCaptions)) {
        return _.get(_.first(manualCaptions), 'baseUrl');
      }

      // Return the first one by default
      return _.get(_.first(captionList), 'baseUrl');

      // Take the first caption available
    } catch (err) {
      pulse.emit('error', err, `getCaptionsUrl(${videoId})`);
      return false;
    }
  },

  /**
   * Get captions for a given videoId
   *
   * @param {String} videoId Id of the video
   * @returns {Array} Array of captions
   **/
  async getCaptions(videoId) {
    try {
      const captionUrl = await this.getCaptionsUrl(videoId);

      if (!captionUrl) {
        pulse.emit(
          'warning',
          'Some videos have no captions',
          `https://youtu.be/${videoId}`
        );
        return [];
      }

      const xml = await axios.get(captionUrl);
      diskLogger.write(`captions/${videoId}.xml`, xml.data);

      const $ = cheerio.load(xml.data, { xmlMode: true });
      const texts = $('text');
      const captions = _.map(texts, node => {
        const $node = $(node);
        const content = cheerio.load($node.text()).text();
        const start = _.round(parseFloat($node.attr('start')), 2);
        const duration = _.round(parseFloat($node.attr('dur')), 2);
        return {
          content,
          start,
          duration,
        };
      });

      return captions;
    } catch (err) {
      pulse.emit('error', err, `getCaptions(${videoId})`);
      return [];
    }
  },

  /**
   * Get all videos as configured in the current config
   *
   * Note: You should always call globals.init(configName) before running this
   * method, so it can get all the required data
   *
   * @returns {Array} All videos of the current config
   **/
  async getVideos() {
    const shouldReadFromCache = globals.readFromCache();

    // Get videos either from disk cache or API
    const videos = shouldReadFromCache
      ? await this.getVideosFromCache()
      : await this.getVideosFromApi();

    pulse.emit('youtube:videos', { videos });

    return videos;
  },
};

export default _.bindAll(module, _.functions(module));
