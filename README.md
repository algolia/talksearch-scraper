# talksearch-scraper

This scraper is an API that index captions of YouTube videos. It works either with a channel name, a playlist id or a video id.

The Algolia indices are `videos` and `captions`.

## Run the API

`yarn install`

Make sure to set the env variables before running the app.

`yarn dev`

## Routes

GET `/index-video/:videoId`

GET `/index-playlist/:playlistId`

GET `/index-channel/:channelName`

## Env variables

* `APP_ID`
* `API_KEY`
* `YOUTUBE_API_KEY`