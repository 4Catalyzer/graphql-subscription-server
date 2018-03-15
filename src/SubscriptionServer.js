/* @flow */

import IoServer from 'socket.io';
import express from 'express';
import type { Server } from 'http';
import type { GraphQLSchema } from 'graphql';
import { promisify } from 'util';

import AuthorizedSocketConnection from './AuthorizedSocketConnection';
import type { CredentialsManager } from './CredentialsManager';
import type { Subscriber } from './Subscriber';
import type { Logger, LoggerFactory } from './Logger';

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
  createLogger?: LoggerFactory,
  createContext?: (request: any) => TContext,
  createCredentialsManager: (
    context?: TContext,
  ) => CredentialsManager<TCredentials>,
  hasPermission: (data: any, credentials: TCredentials) => boolean,
|};

const defaultCreateLogger = () => () => {};

export default class SubscriptionServer<TContext, TCredentials> {
  log: Logger;
  config: SubscriptionServerConfig<TContext, TCredentials>;
  io: SocketIoServer;
  subscriber: Subscriber;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    const createLogger: LoggerFactory =
      config.createLogger || defaultCreateLogger;

    this.log = createLogger('@4c/SubscriptionServer::Server');

    this.config = config;
    this.io = new IoServer({
      serveClient: false,
      path: this.config.path,
      transports: ['websocket'],
      wsEngine: 'ws',
    });

    this.io.on('connection', socket => {
      this.log('debug', 'New Socket connection made');
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
        createLogger: this.config.createLogger || defaultCreateLogger,
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
