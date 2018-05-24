# TalkSearch scraper

This scraper is a command line tool that extract information from YouTube
playlists and push them to Algolia.

## Usage

```
# Indexing one video
yarn index 'https://www.youtube.com/watch?v=RLO9MJFi3sI'
# Indexing one playlist
yarn index ''https://www.youtube.com/playlist?list=PLMW8Xq7bXrG7AAvnkys8joKEq8uMGykx7'
# Indexing one channel
yarn index 'https://www.youtube.com/channel/UCSRhwaM00ay0fasnsw6EXKA'
```

## How it works

The command will use the YouTube API to fetch data about the
channel/playlist/video and push them to Algolia.

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

- `ALGOLIA_APP_ID` and `ALGOLIA_API_KEY` for pushing records to Algolia
- `YOUTUBE_API_KEY` to connect to the YouTube API

We suggest using a tool like [direnv][1] to load those
variables through the use of a `.envrc` file.

Once everything is installed, you should be able to run `yarn index
{youtube_url}`

## Options

### `--log`

This flag should be used when debugging an indexing. It will write to disk all
HTTP call responses made (in the `./logs` directory). This is useful for
analysing calls.

### `--to-cache` and `--from-cache`

When `--to-cache` is present, the data obtained from the YouTube API will be
saved on disk instead of being transformed into records and pushed to Algolia.

When `--from-cache` is present, data will be read directly from disk (as saved
with `--to-cache`) instead of obtained through the API before being send to
Algolia.

The combination of those two options will allow you to independently debug the
crawling of data and the transformation of data to records.


[1]: https://direnv.net/
