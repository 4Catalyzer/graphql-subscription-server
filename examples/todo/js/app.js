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
  IndexRoute,
  Route,
  Router,
  useRouterHistory,
} from 'react-router';
import useRelay from 'react-router-relay';
import RelaySubscriptions from 'relay-subscriptions';

import NetworkLayer from './NetworkLayer';
import TodoApp from './components/TodoApp';
import TodoList from './components/TodoList';
import ViewerQueries from './queries/ViewerQueries';

const history = useRouterHistory(createHashHistory)({ queryKey: false });

const environment = new RelaySubscriptions.Environment();
const network = new NetworkLayer('/graphql');

network.setToken(
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImdyYXBocWwtc3Vic2NyaXB0aW9ucy10ZXN0LWtleSJ9.eyJzdWIiOiJKaW1teSIsImlhdCI6MTUxOTg0MTk3NSwiZXhwIjoxNTE5ODc3OTc1fQ.d4n51uNaKaUBzrNTthVyb8VGn_y-gfhpj-mJG5O1IIlMm9LTVDR_ArEDdrExilB2ng32jCLncEFNDjJAJ16nAEceeyTIcQ1bIiASKxguD46WBNMTyjqTC7xSwQ2yX3kDgPjlIR_OmC52ppCT2bju3OjgDOzBJNusyMzGG-KNGNZb5-qpqRrMvtFXERaT16LYVLt7iCakW3QCEC-6OMjrwWn-heDfFOwAIh4OioC6ogmUuCjtHkCfIQgQex338PxpD8pyDC5FD-a2SvU3SS46-5D4o_-vN2IZNBAq11aStnIrXzGCMXfd-4j69jV5eBy1U35fsEXXmYQAHe12yrQavA',
);

environment.injectNetworkLayer(network);

const mountNode = document.getElementById('root');

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
        prepareParams={() => ({ status: 'any' })}
      />
      <Route path=":status" component={TodoList} queries={ViewerQueries} />
    </Route>
  </Router>,
  mountNode,
);
