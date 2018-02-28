/* eslint-disable no-console */

import Relay from 'react-relay/classic';

import SubscriptionClient from './SubscriptionClient';

export default class NetworkLayer extends Relay.DefaultNetworkLayer {
  constructor(...args) {
    super(...args);

    this.token = null;
    this.client = new SubscriptionClient();
  }
  setToken(token) {
    if (token) {
      this._init.headers = {
        ...this._init.headers,
        Authorization: `Bearer ${token}`,
      };
    } else if (this._init.headers) {
      delete this._init.headers.Authorization;
    }
    this.client.setToken(token);
  }

  sendSubscription(request) {
    return this.client.subscribe(request);
  }

  disconnect() {
    this.socket.disconnect();
  }
}
