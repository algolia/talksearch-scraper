import fs from 'fs';
import _ from 'lodash';
import chalk from 'chalk';
import inquirer from 'inquirer';
import slugify from 'slugify';
import queryString from 'query-string';
import pMap from 'p-map';
import youtube from '../src/youtube.js';
import prettier from 'prettier';

const newConfig = {
  // Open a prompt and wait for the answer
  async prompt(question) {
    const answer = await inquirer.prompt([{ name: 'key', message: question }]);
    return answer.key;
  },

  // Ask for the config name
  async getConfigName() {
    let configName = await this.prompt('What is the config name?');
    configName = slugify(configName);
    if (fs.existsSync(`./configs/${configName}.js`)) {
      console.info(
        chalk.red(`✘ There is already a config named ${configName}`)
      );
      return await this.getConfigName();
    }
    return configName;
  },

  // Ask for playlist ids
  async getPlaylistIds(memo = []) {
    let question;
    if (_.isEmpty(memo)) {
      question = 'Enter a playlist ID or playlist url:';
    } else {
      const addenda = chalk.grey('(leave empty if not)');
      question = `Other playlist ID or playlist url? ${addenda}`;
    }

    let playlistId = await this.prompt(question);
    const potentialQueryString = queryString.parse(playlistId);
    if (potentialQueryString.list) {
      playlistId = potentialQueryString.list;
    }

    if (!playlistId) {
      return _.uniq(memo);
    }
    memo.push(playlistId);
    return await this.getPlaylistIds(memo);
  },
};

(async () => {
  try {
    const configName = await newConfig.getConfigName();
    const playlistIds = await newConfig.getPlaylistIds();

    // Get name of playlists along with ids
    const playlists = [];
    await pMap(playlistIds, async playlistId => {
      const playlistData = await youtube.getPlaylistData(playlistId);
      playlists.push({ id: playlistId, name: playlistData.title });
    });
    const playlistReplace = _.map(
      _.sortBy(playlists, ['name']),
      playlist => `'${playlist.id}', // ${playlist.name}`
    ).join('\n');

    // Read the sample and update the content
    const sampleContent = fs.readFileSync(
      './configs/config.sample.js',
      'utf-8'
    );
    let newContent = _.replace(sampleContent, '{{indexName}}', configName);
    newContent = _.replace(
      newContent,
      "'{{playlistIds}}'",
      `\n${playlistReplace}\n`
    );
    newContent = prettier.format(newContent, {
      singleQuote: true,
      trailingComma: 'all',
    });

    // Write to disk
    fs.writeFileSync(`./configs/${configName}.js`, newContent);
    console.info(
      `${chalk.green('✔')} Config for ${chalk.green(configName)} saved.`
    );
  } catch (err) {
    console.info(chalk.red('✘ ERROR:'));
    console.info(err.message);
    process.exit(1); // eslint-disable-line no-process-exit
  }
})();
