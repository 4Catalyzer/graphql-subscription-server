/* eslint-disable import/no-extraneous-dependencies */
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

import http from 'http';
import path from 'path';

import {
  EventSubscriber,
  JwtCredentialsManager,
} from '@4c/graphql-subscription-server';
import type { JwtCredentials } from '@4c/graphql-subscription-server/JwtCredentialsManager';
import SubscriptionServer from '@4c/graphql-subscription-server/SubscriptionServer';
import express from 'express';
import graphQLHTTP from 'express-graphql';
import jwt from 'jsonwebtoken';
import { rsaPublicKeyToPEM } from 'jwks-rsa/lib/utils';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';

import * as database from './database';
import { schema } from './schema';

const APP_PORT = 3000;
const GRAPHQL_PORT = 8080;
const BASE_APP = path.resolve(__dirname, '..', 'src');

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
  getCredentialsFromAuthorization(token: string) {
    const { header } = jwt.decode(token, { complete: true }) as {
      header: { kid: string };
    };

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwkSet = require('./jwk-set.json');

    const jwk = jwkSet.keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        rsaPublicKeyToPEM(jwk.n, jwk.e),
        { algorithms: ['RS256'] },
        (err, payload: any) => {
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

// Serve the Relay app
// Calling webpack() without a callback as 2nd property returns a Compiler object.
const compiler: webpack.Compiler = webpack({
  mode: 'development',
  entry: ['whatwg-fetch', path.resolve(BASE_APP, 'app')],
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.tsx', '.json'],
  },
  output: {
    filename: 'app.js',
    path: '/',
  },
});

const app = new WebpackDevServer(compiler, {
  contentBase: '/public/',
  publicPath: '/js/',
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
  stats: { colors: true },
});

// Serve static resources
// @ts-ignore
app.use('/', express.static(path.resolve(BASE_APP, 'public')));

app.listen(APP_PORT, () => {
  console.log(`App is now running on http://localhost:${APP_PORT}`);
});
