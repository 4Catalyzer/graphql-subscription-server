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

import 'todomvc-common';

import * as React from 'react';
import ReactDOM from 'react-dom';
import { QueryRenderer, graphql } from 'react-relay';
import {
  SocketIoSubscriptionClient,
  createFetch,
  createSubscribe,
} from 'relay-network-layer';
import { Environment, Network, RecordSource, Store } from 'relay-runtime';

import { appQuery } from './__generated__/appQuery.graphql';
import TodoApp from './components/TodoApp';

function createEnvironment() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
  const { token } = require('../token.json');

  const subscribeFn = createSubscribe({
    subscriptionClientClass: SocketIoSubscriptionClient,
    url: `/subscriptions`,
    token,
  });

  const network = Network.create(
    createFetch({
      url: '/graphql',
      authorization: { token, scheme: 'JWT' },
      batch: false,
    }),
    subscribeFn,
  );

  return new Environment({
    network,
    store: new Store(new RecordSource()),
  });
}

const rootElement = document.getElementById('root');
export const environment = createEnvironment();

if (rootElement) {
  ReactDOM.render(
    <QueryRenderer<appQuery>
      environment={environment}
      fetchPolicy="store-and-network"
      query={graphql`
        query appQuery {
          viewer {
            ...TodoApp_user
          }
        }
      `}
      variables={{}}
      render={({ error, props }) => {
        if (props?.viewer) {
          // eslint-disable-next-line react/prop-types
          return <TodoApp user={props.viewer} />;
        }
        if (error) {
          return <div>{error.message}</div>;
        }

        return <div>Loading</div>;
      }}
    />,
    rootElement,
  );
}
