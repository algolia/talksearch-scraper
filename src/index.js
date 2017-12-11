import express from 'express';
import bodyParser from 'body-parser';
import { index } from './routes';
import auth from 'http-auth';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

const basic = auth.basic(
  {
    realm: 'Basic auth',
  },
  (username, password, callback) => {
    callback(
      username === process.env.AUTH_USERNAME &&
        password === process.env.AUTH_PASSWORD
    );
  }
);
const authMiddleware = auth.connect(basic);

const distPath = path.join(__dirname, '..', 'UI', 'dist');

app.use('/static', express.static(`${distPath}/static`));
app.use(bodyParser.json());

app.post('/index', authMiddleware, index);
app.get('/', (req, res) => {
  res.sendFile(`${distPath}/index.html`);
});

const server = app.listen(port, () =>
  console.log(`Running on localhost:${port}`)
);
server.setTimeout(500000);
