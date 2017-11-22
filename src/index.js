import express from 'express';
import bodyParser from 'body-parser';
import { indexChannel } from './routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use('/index/channel/:channelName', indexChannel);

app.get('/*', (req, res) => {
  res.send({ test: 'true' });
});

app.listen(port, () => console.log(`Running on localhost:${port}`));
