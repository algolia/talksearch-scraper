import express from 'express';
import bodyParser from 'body-parser';
import { index, reindex } from './routes';
import auth from 'http-auth';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

const basic = auth.basic(
  {
    realm: 'Basic auth',
  },
  (username, password, callback) => {
    callback(password === process.env.API_TOKEN);
  }
);
const authMiddleware = auth.connect(basic);

const distPath = path.join(__dirname, '..', 'UI', 'dist');

app.use('/static', express.static(`${distPath}/static`));
app.use(bodyParser.json());

if (process.env.NODE_ENV !== 'production') {
  // Enable CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:8081');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    next();
  });
}

app.post('/index', authMiddleware, index);
app.post('/reindex', authMiddleware, reindex);
app.get('/', (req, res) => {
  res.sendFile(`${distPath}/index.html`);
});

const server = app.listen(port, () =>
  console.log(`Running on localhost:${port}`)
);
server.setTimeout(500000);
