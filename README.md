# talksearch-scraper

This scraper is an API that index captions of YouTube videos. It works either with a channel, a playlist or a video URL.

The index that list all indexed video is `ALL_VIDEOS`.

The generated indices are:
* `<channelName>`: one indexed channel 
* `<channelName>-playlist-<playlistId>`: one indexed playlist
* `<channelName>-video-<videoId>`: one indexed video

The `/index` route returns the following JSON:
```
{
  success: Boolean,
  message: String,      // Message in case of error
  indexName: String,
  totalVideos: Number,
  failures: Array,      // Array of videos' IDs that failed (no english subtitles)
  indexedVideos: Number
}
```

## Run the API

`yarn install`

Make sure to set the env variables before running the app.

`yarn dev`

## Routes

POST `/index`
```
{
  youtubeURL: String,  // the YouTube URL of the channel/playlist/video
  speaker: {
    extract: Boolean,
    regex: String,     // Optional
    nbSubStr: Number   // Optional 
  }
}
```

## Env variables

* `APP_ID`
* `API_KEY`
* `YOUTUBE_API_KEY`
