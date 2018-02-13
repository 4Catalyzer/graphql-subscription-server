/* @flow */

import IoServer from 'socket.io';
import express from 'express';
import type { ClientOpts } from 'redis';
import type { GraphQLSchema } from 'graphql';
import { promisify } from 'util';

import AuthorizedSocketConnection from './AuthorizedSocketConnection';
import type { ICredentialsManager } from './CredentialManager';
import RedisSubscriber from './RedisSubscriber';

type SocketIoServer = {
  attach(any): void,
  close(cb: any): void,
};

export type SubscriptionServerConfig<TContext, TCredentials> = {|
  path: string,
  defaultParseMessage: any,
  hasPermission: any,
  maxSubscriptionsPerConnection: number,
  gracePeriodSeconds: number,
  createContext: (request: any) => TContext,
  createCredentialsManager: (
    context: TContext,
  ) => ICredentialsManager<TCredentials>,
  redisConfiguration: ClientOpts,
  schema: GraphQLSchema,
|};

export default class SubscriptionServer<TContext, TCredentials> {
  config: SubscriptionServerConfig<TContext, TCredentials>;
  io: SocketIoServer;
  redis: RedisSubscriber;

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

      const context = config.createContext(request);
      const credentialsManager = config.createCredentialsManager(context);

      // eslint-disable-next-line no-new
      new AuthorizedSocketConnection({
        redis: this.redis,
        context,
        socket,
        credentialsManager,
        schema: this.config.schema,
        defaultParseMessage: this.config.defaultParseMessage,
        hasPermission: this.config.hasPermission,
      });
    });
  }

  attach(httpServer: any) {
    this.redis = new RedisSubscriber(this.config.redisConfiguration);
    this.io.attach(httpServer);
  }

  async close() {
    await promisify((...args) => this.io.close(...args))();
    await this.redis.close();
  }
}
