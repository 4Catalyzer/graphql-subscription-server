import http from 'http';

import socketio, { Socket } from 'socket.io-client';

import { CredentialsManager } from '../src/CredentialsManager';
import RedisSubscriber from '../src/RedisSubscriber';
import type SubscriptionServer from '../src/SubscriptionServer';

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function graphql(strings: any): string {
  if (strings.length !== 1) {
    throw new Error('must not use string interpolation with GraphQL query');
  }

  return strings[0];
}

export class TestCredentialsManager implements CredentialsManager<any> {
  private credentials: any = null;

  getCredentials() {
    return Promise.resolve(this.credentials);
  }

  authenticate() {
    this.credentials = {};
  }

  unauthenticate() {
    this.credentials = null;
  }
}

export async function startServer(
  createServer: (sub: RedisSubscriber) => SubscriptionServer<any, any>,
) {
  const subscriber = new RedisSubscriber({
    parseMessage: (msg) => JSON.parse(msg)?.data,
  });

  const httpServer = http.createServer();
  const server = createServer(subscriber);

  server.attach(httpServer);

  await new Promise<void>((resolve) =>
    httpServer.listen(5000, () => {
      resolve();
    }),
  );

  return {
    server,
    httpServer,
    subscriber,
    async close() {
      await server.close();
    },
  };
}

export class TestClient {
  socket: Socket;

  constructor(
    public subscriber: RedisSubscriber,
    public query: string,
    public variables: Record<string, any> | null = null,
  ) {
    this.socket = socketio('http://localhost:5000', {
      path: '/graphql',
      transports: ['websocket'],
    });
  }

  init() {
    const { socket } = this;
    return new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        // console.debug('CONNECT');
        socket.once('connect_error', (data: Record<string, any>) => {
          console.error(data);
          reject(new Error(`connect_error: ${JSON.stringify(data)}`));
        });
        setTimeout(() => resolve(), 0);
      });
    });
  }

  authenticate() {
    return new Promise((resolve) => {
      this.socket.emit('authenticate', 'token', resolve);
    });
  }

  unsubscribe(id = 'foo') {
    return new Promise<void>((resolve) =>
      this.socket.emit('unsubscribe', id, () => {
        resolve();
      }),
    );
  }

  subscribe(id = 'foo') {
    return new Promise<void>((resolve) =>
      this.socket.emit(
        'subscribe',
        {
          id,
          query: this.query,
          variables: this.variables,
        },
        () => {
          resolve();
        },
      ),
    );
  }

  async subscribeAndPublish({
    topic,
    data,
    subscribe = true,
  }: {
    topic: string;
    data?: Record<string, any>;
    subscribe?: boolean;
  }) {
    if (subscribe) {
      await this.subscribe();
    }
    if (data) {
      this.subscriber.redis.publish(topic, JSON.stringify({ data }));
    }
  }

  getSubscriptionResult(info: {
    topic: string;
    data?: Record<string, any>;
    subscribe?: boolean;
  }) {
    const events = ['subscription update', 'app_error', 'connection_error'];
    const result = Promise.race(
      events.map(
        (event) =>
          new Promise((resolve) => {
            this.socket.on(event, (payload: Record<string, any>) => {
              resolve({ event, payload });
            });
          }),
      ),
    );

    // no need to await this
    this.subscribeAndPublish(info);

    return result;
  }

  close() {
    // @ts-ignore
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}
