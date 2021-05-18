// import { RedisClient } from 'redis';
// import type { Socket } from 'socket.io-client';
// import socketio from 'socket.io-client';
import { EventEmitter } from 'events';
import http from 'http';

import socketio, { Socket } from 'socket.io-client';
import WebSocket from 'ws';

import { CredentialsManager } from '../src/CredentialsManager';
import RedisSubscriber from '../src/RedisSubscriber';
import type SubscriptionServer from '../src/SubscriptionServer';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
      httpServer.close();
      await server.close();
    },
  };
}

let i = 0;
class WebSocketShim extends EventEmitter {
  socket: WebSocket;

  id: string;

  constructor(path: string, { protocol = 'socket-io' } = {}) {
    super();
    const socket = new WebSocket(path, { protocol });

    this.socket = socket;
    this.id = uuid();

    socket.on('message', (data) => {
      const { type, payload } = JSON.parse(data.toString());
      super.emit(type, payload);
    });
  }

  private ack(cb?: (data?: any) => void) {
    if (!cb) return undefined;

    const ackId = i++;
    this.once(`ack:${ackId}`, (data) => {
      cb(data);
    });
    return ackId;
  }

  emit(type: string, data: any, cb?: () => void) {
    this.socket.send(
      JSON.stringify({
        type,
        payload: data,
        ackId: this.ack(cb),
      }),
    );
    return true;
  }

  disconnect() {
    this.socket.removeAllListeners();
    this.socket.close();
  }
}

export class TestClient {
  socket: Socket | WebSocketShim;

  constructor(
    public subscriber: RedisSubscriber,
    public query: string,
    public variables: Record<string, any> | null = null,
    { engine = 'socket.io' }: { engine?: 'socket.io' | 'ws' } = {},
  ) {
    this.socket =
      engine === 'socket.io'
        ? socketio('http://localhost:5000', {
            path: '/graphql',
            transports: ['websocket'],
          })
        : new WebSocketShim('ws://localhost:5000/graphql');
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
