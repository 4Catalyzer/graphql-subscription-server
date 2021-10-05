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
  TCredentials,
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
      const clientId = socket.id;

      const request = Object.create((express as any).request);
      Object.assign(request, socket.request);

      this.log('debug', 'new socket connection', {
        clientId,
        numClients: this.io.engine?.clientsCount ?? 0,
      });

      this.initConnection(
        {
          id: clientId,
          protocol: '4c-subscription-server',
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

      // add after so the logs happen in order
      socket.once('disconnect', (reason) => {
        this.log('debug', 'socket disconnected', {
          reason,
          clientId,
          numClients: (this.io.engine.clientsCount ?? 0) - 1, // number hasn't decremented at this point for this client
        });
      });
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
