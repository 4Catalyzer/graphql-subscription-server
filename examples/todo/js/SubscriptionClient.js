import io from 'socket.io-client';

export default class SubscriptionClient {
  constructor(origin) {
    this.socket = io(origin, {
      path: '/subscriptions',
      transports: ['websocket'],
    });

    this.token = null;
    this.requests = new Map();

    this.socket.on('app_error', err => {
      console.log(err);
    });

    this.socket.on('connect', () => {
      if (this.token) this.emitTransient('authenticate', this.token);

      this.requests.forEach(request => {
        this.subscribe(request);
      });
    });

    this.socket.on('subscription update', ({ id, data, errors }) => {
      const request = this.requests.get(id);
      if (!request) return;

      if (errors) {
        request.onError(errors);
      } else {
        request.onNext(data);
      }
    });
  }

  setToken(token) {
    this.token = token;
    this.emitTransient('authenticate', this.token);
  }

  subscribe(request) {
    const id = request.getClientSubscriptionId();

    this.requests.set(id, request);
    this.emitTransient('subscribe', {
      id,
      query: request.getQueryString(),
      variables: request.getVariables(),
    });
    return {
      dispose: () => {
        this.emitTransient('unsubscribe', id);
        this.requests.delete(id);
        request.onCompleted();
      },
    };
  }

  emitTransient(...args) {
    if (!this.socket.connected) return;
    this.socket.emit(...args);
  }

  disconnect() {
    this.socket.disconnect();
    this.requests.forEach(request => {
      request.onCompleted();
    });
  }
}
