/* @flow */

import IoServer from 'socket.io';
import express from 'express';
import type { Server } from 'http';
import type { GraphQLSchema } from 'graphql';
import { promisify } from 'util';

import AuthorizedSocketConnection from './AuthorizedSocketConnection';
import type { CredentialsManager } from './CredentialsManager';
import type { Subscriber } from './Subscriber';

type SocketIoServer = {
  attach(any): void,
  close(cb: any): void,
};

export type SubscriptionServerConfig<TContext, TCredentials> = {|
  path: string,
  schema: GraphQLSchema,
  subscriber: Subscriber,
  server: Server,
  maxSubscriptionsPerConnection?: number,
  createContext?: (request: any) => TContext,
  createCredentialsManager: (
    context?: TContext,
  ) => CredentialsManager<TCredentials>,
  hasPermission: (data: any, credentials: TCredentials) => boolean,
|};

export default class SubscriptionServer<TContext, TCredentials> {
  config: SubscriptionServerConfig<TContext, TCredentials>;
  io: SocketIoServer;
  subscriber: Subscriber;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    this.config = config;
    this.io = new IoServer({
      serveClient: false,
      path: this.config.path,
      transports: ['websocket'],
      wsEngine: 'ws',
    });

    this.io.on('connection', socket => {
      const request = Object.create((express: any).request);
      Object.assign(request, socket.request);

      const context = config.createContext && config.createContext(request);
      const credentialsManager = config.createCredentialsManager(context);

      // eslint-disable-next-line no-new
      new AuthorizedSocketConnection({
        context,
        socket,
        credentialsManager,
        schema: this.config.schema,
        subscriber: this.config.subscriber,
        hasPermission: this.config.hasPermission,
      });
    });
  }

  attach(httpServer: any) {
    this.io.attach(httpServer);
  }

  async close() {
    await promisify((...args) => this.io.close(...args))();
  }
}
