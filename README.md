# talksearch-scraper

This scraper is an API that index captions of YouTube videos. It works with channel names, playlist ids and video ids.

The Algolia indices are `videos` and `captions`.

## Run the API

`yarn install`

`yarn dev`

## Routes

GET `/index-video/:videoId`

GET `/index-playlist/:playlistId`

GET `/index-channel/:channelName`

## Env variables

* `ALGOLIA_APP_ID`
* `ALGOLIA_API_KEY`
* `YOUTUBE_API_KEY`