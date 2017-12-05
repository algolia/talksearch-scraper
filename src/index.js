import express from 'express';
import bodyParser from 'body-parser';
import { index } from './routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/index', index);
app.get('/*', (req, res) => {
  res.send({ ping: 'pong' });
});

app.listen(port, () => console.log(`Running on localhost:${port}`));
