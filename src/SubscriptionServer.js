/* @flow */

import IoServer from 'socket.io';
import express from 'express';
import type { ClientOpts } from 'redis';
import type { GraphQLSchema } from 'graphql';
import { promisify } from 'util';
import TenantSocketConnection, {
  type Credentials,
  type Context,
} from './TenantSocketConnection';
import RedisSubscriber from './RedisSubscriber';

type SocketIoServer = {
  attach(any): void,
  close(cb: any): void,
};

type SubscriptionServerConfig = {|
  path: string,
  fetchCredentials: (
    context: Context,
    authorization: string,
  ) => Promise<Credentials>,
  defaultParseMessage: any,
  hasPermission: any,
  maxSubscriptionsPerConnection: number,
  gracePeriodSeconds: number,
  createContext: (request: any) => Context,
  redisConfiguration: ClientOpts,
  schema: GraphQLSchema,
|};

export default class SubscriptionServer {
  config: SubscriptionServerConfig;
  io: SocketIoServer;
  redis: RedisSubscriber;

  constructor(config: SubscriptionServerConfig) {
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

      // eslint-disable-next-line no-new
      new TenantSocketConnection({
        redis: this.redis,
        context,
        socket,
        schema: this.config.schema,
        fetchCredentials: this.config.fetchCredentials,
        defaultParseMessage: this.config.defaultParseMessage,
        hasPermission: this.config.hasPermission,
        gracePeriodSeconds: this.config.gracePeriodSeconds,
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
