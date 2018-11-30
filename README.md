# TalkSearch scraper

This scraper is a command-line tool that extract information from YouTube
playlists and push them to Algolia.

## Usage

```shell
yarn index {config_name}
```

## How it works

The `./configs/` folder contain custom configs, each containing a list of
playlists to index.

The command will use the YouTube API to fetch data about the defined playlists
and push them to Algolia.

Captions will be extracted from the videos if they are available. Each record in
Algolia will represent one caption, also containing a `.video`, `.playlist` and
`.channel` key. The `distinct` feature of Algolia is used to group records of
the same video together, to display the most relevant caption each time.

Each channel will have its own index called `{channel_name}_{channel_id}`. All
videos of all playlists will be saved in this index, but can be filtered based
on the `channel.id` and `playlist.id` keys of the records.

## Development

Start with `yarn install` to load all the dependencies.

The project will need `ENV` variables to connect to the services.

* `ALGOLIA_APP_ID` and `ALGOLIA_API_KEY` for pushing records to Algolia
* `YOUTUBE_API_KEY` to connect to the YouTube API
* `GOOGLE_APPLICATION_CREDENTIALS` that point to the path to your
  `google.service-account-file.json` ([create one here][2])

We suggest using a tool like [direnv][1] to load those variables through the use
of a `.envrc` file.

Once everything is installed, you can run `yarn index {config_name}`

## Debug calls

### `yarn run index:cache`

This will read data from a disk cache of previous requests instead of making
actual HTTP calls. If there is no cache hit for the request, it will do it for
real.

This should be the preferred way of running the command for debugging purposes.

### `yarn run index:logs`

This will log all HTTP calls raw responses to disk. This is useful when
debugging, as it allow to dig into the responses of the APIs called.

[1]: https://direnv.net/
[2]: https://console.cloud.google.com/apis/credentials/serviceaccountkey
