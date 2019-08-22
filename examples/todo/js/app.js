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

import { createHashHistory } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  applyRouterMiddleware,
  useRouterHistory,
  Router,
  Route,
  IndexRoute,
} from 'react-router';
import useRelay from 'react-router-relay';
import RelaySubscriptions from 'relay-subscriptions';

import NetworkLayer from './NetworkLayer';
import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';
import ViewerQueries from './queries/ViewerQueries';

// eslint-disable-next-line react-hooks/rules-of-hooks
const history = useRouterHistory(createHashHistory)({ queryKey: false });

const environment = new RelaySubscriptions.Environment();
const network = new NetworkLayer('/graphql');

network.setToken(require('../token.json').token);

environment.injectNetworkLayer(network);

const mountNode = document.getElementById('root'); // eslint-disable-line

ReactDOM.render(
  <Router
    environment={environment}
    history={history}
    render={applyRouterMiddleware(useRelay)}
    forceFetch
  >
    <Route path="/" component={TodoApp} queries={ViewerQueries}>
      <IndexRoute
        component={TodoList}
        queries={ViewerQueries}
        prepareParams={params => ({ ...params, status: 'any' })}
      />
      <Route path=":status" component={TodoList} queries={ViewerQueries} />
    </Route>
  </Router>,
  mountNode,
);
