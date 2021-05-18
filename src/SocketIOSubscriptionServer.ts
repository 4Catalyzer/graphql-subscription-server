import { promisify } from 'util';

import express from 'express';
import type io from 'socket.io';

import SubscriptionServer, {
  SubscriptionServerConfig,
} from './SubscriptionServer';

export interface SocketIOSubscriptionServerConfig<TContext, TCredentials>
  extends SubscriptionServerConfig<TContext, TCredentials> {
  socketIoServer?: io.Server;
}

export default class SocketIOSubscriptionServer<
  TContext,
  TCredentials
> extends SubscriptionServer<TContext, TCredentials> {
  io: io.Server;

  constructor({
    socketIoServer,
    ...config
  }: SocketIOSubscriptionServerConfig<TContext, TCredentials>) {
    super(config);

    this.io = socketIoServer!;
    if (!this.io) {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const IoServer = require('socket.io').Server;
      this.io = new IoServer({
        serveClient: false,
        path: this.config.path,
        transports: ['websocket'],
        allowEIO3: true,
      });
    }

    this.io.on('connection', (socket: io.Socket) => {
      const request = Object.create((express as any).request);
      Object.assign(request, socket.request);
      this.opened(
        {
          id: socket.id,
          protocol: 'socket-io',
          on: socket.on.bind(socket),
          emit(event: string, data: any) {
            socket.emit(event, data);
          },
          close() {
            socket.disconnect();
          },
        },
        request,
      );
    });
  }

  attach(httpServer: any) {
    this.io.attach(httpServer);
  }

  async close() {
    // @ts-ignore
    await promisify((...args) => this.io.close(...args))();
  }
}
