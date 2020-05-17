/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* eslint-disable no-console */
import http from 'http';
import path from 'path';

import EventSubscriber from '@4c/graphql-subscription-server/lib/EventSubscriber';
import JwtCredentialsManager, {
  JwtCredentials,
} from '@4c/graphql-subscription-server/lib/JwtCredentialsManager';
import SubscriptionServer from '@4c/graphql-subscription-server/lib/SubscriptionServer';
import express from 'express';
import graphQLHTTP from 'express-graphql';
import jwt from 'jsonwebtoken';
import { rsaPublicKeyToPEM } from 'jwks-rsa/lib/utils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import database from './data/database';
import { schema } from './data/schema';

const APP_PORT = 3000;
const GRAPHQL_PORT = 8080;

const createContext = () => ({
  database,
});

// Expose a GraphQL endpoint
const graphQLApp = express();

const server = http.createServer(graphQLApp);

graphQLApp.use(
  '/graphql',
  graphQLHTTP({
    schema,
    pretty: true,
    graphiql: true,
    context: createContext(),
  }),
);

type Credentials = JwtCredentials & {
  user: string | null | undefined;
};

class CredentialsManager extends JwtCredentialsManager<Credentials> {
  getCredentialsFromAuthorization(token) {
    const { header } = jwt.decode(token, { complete: true });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwkSet = require('./jwk-set.json');

    const jwk = jwkSet.keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        rsaPublicKeyToPEM(jwk.n, jwk.e),
        { algorithms: ['RS256'] },
        (err, payload) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({ user: payload.sub, exp: payload.exp });
        },
      );
    });
  }
}

const subscriptionServer = new SubscriptionServer({
  path: '/subscriptions',
  schema,
  subscriber: new EventSubscriber(database),
  createCredentialsManager: () =>
    new CredentialsManager({ tokenExpirationMarginSeconds: null }),
  hasPermission: () => true,
  createContext,
  createLogger: (group = '') => (level, message, meta) => {
    console.log(
      `${level}:${group && ` [${group}]`} ${message} ${
        meta ? `\n\n${JSON.stringify(meta, null, 2)}` : ''
      }`,
    );
  },
});

subscriptionServer.attach(server);

server.listen(GRAPHQL_PORT, () => {
  console.log(
    `GraphQL Server is now running on http://localhost:${GRAPHQL_PORT}`,
  );
});

// Serve the Relay app.
const compiler = webpack({
  mode: 'development',

  entry: './js/app.js',

  output: {
    path: '/',
    filename: 'app.js',
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              [
                '@4c',
                {
                  target: 'web-app',
                  useBuiltIns: 'usage',
                },
              ],
              '@babel/flow',
            ],
            plugins: [['relay', { schema: 'data/schema.graphql' }]],
          },
        },
      },
    ],
  },

  devtool: 'sourcemap',
});

const app = new WebpackDevServer(compiler, {
  contentBase: '/public/',
  proxy: {
    '/graphql': {
      target: `http://localhost:${GRAPHQL_PORT}`,
      logLevel: 'debug',
    },
    '/subscriptions': {
      target: `http://localhost:${GRAPHQL_PORT}`,
      logLevel: 'debug',
      ws: true,
    },
  },
  publicPath: '/js/',
  stats: { colors: true },
});

// Serve static resources
app.use('/', express.static(path.join(__dirname, 'public')));
app.listen(APP_PORT, 'localhost', () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
