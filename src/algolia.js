import indexing from 'algolia-indexing';
import _ from 'lodash';
import globals from './globals';
import chalk from 'chalk';
import defaultIndexSettings from './algolia.settings';

export default {
  run(records) {
    const credentials = {
      apiKey: globals.algoliaApiKey(),
      appId: globals.algoliaAppId(),
      indexName: 'atomic_test',
    };

    let settings = defaultIndexSettings;
    const transformSettings = _.get(globals.config(), 'transformSettings');
    if (transformSettings) {
      settings = transformSettings(settings);
    }

    console.info(chalk.blue('Pushing to Algolia'));
    indexing.verbose();
    indexing.fullAtomic(credentials, records, settings);
  },
};
