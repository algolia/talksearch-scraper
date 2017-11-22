import express from 'express';
import bodyParser from 'body-parser';
import { indexChannel, indexPlaylist, indexVideo } from './routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.get('/index-channel/:channelName', indexChannel);
app.get('/index-playlist/:playlistId', indexPlaylist);
app.get('/index-video/:videoId', indexVideo);
app.get('/*', (req, res) => {
  res.send({ test: 'true' });
});

app.listen(port, () => console.log(`Running on localhost:${port}`));
