import fileutils from './fileutils';
import _ from 'lodash';

const DiskLogger = {
  enabled: false,
  /**
   * Log the API return data to disk
   *
   * @param {String} destination File path to save the file (in the ./logs
   * directory)
   * @param {Object|String} content Content to store on disk
   * @returns {Promise} Write on disk promise
   *
   * Note that if the content is an object, it will be saved as pretty printed
   * JSON, otherwise it will be saved as raw text.
   **/
  async write(destination, content) {
    if (!this.enabled) {
      return false;
    }

    const writeMethod = _.isObject(content)
      ? fileutils.writeJSON
      : fileutils.write;
    const writing = await writeMethod(`./logs/${destination}`, content);
    return writing;
  },
};

export default DiskLogger;
