# talksearch-scraper

This scraper is an API that index captions of YouTube videos. It works either with a channel name, a playlist id or a video id.

The Algolia indices are:
* `ALL_VIDEOS`: all indexed videos
* `<channelName>`: one indexed channel 
* `<channelName>-playlist-<playlistId>`: one indexed playlist
* `<channelName>-video-<videoId>`: one indexed video

Every routes return the same JSON format. For example if we target `/index-channel/GConfs` (`GConfs` being a YouTube channel of EPITA talks), it will return:

```
{
  indexName: "GConfs",
  totalVideos: 20,
  failures: [
    "WQuqm71J-fo",
    "3QKNIOxBrpQ",
    "Q80zPtWhDLs",
    "c4kBo6DAg3M",
    "jNuJXjD9veQ"
  ],
  indexedVideos: 15
}
```

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