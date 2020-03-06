import { promisify } from 'util';

import express from 'express';
import { GraphQLSchema } from 'graphql';
import IoServer from 'socket.io';

import AuthorizedSocketConnection, {
  CreateValidationRules,
} from './AuthorizedSocketConnection';
import { CredentialsManager } from './CredentialsManager';
import { CreateLogger, Logger } from './Logger';
import { Subscriber } from './Subscriber';

export interface SubscriptionServerConfig<TContext, TCredentials> {
  path: string;
  schema: GraphQLSchema;
  subscriber: Subscriber<any>;
  createCredentialsManager: (request: any) => CredentialsManager<TCredentials>;
  hasPermission: (data: any, credentials: TCredentials) => boolean;
  createContext?: (
    request: any,
    credentials: TCredentials | null | undefined,
  ) => TContext;
  maxSubscriptionsPerConnection?: number;
  createValidationRules?: CreateValidationRules;
  createLogger?: CreateLogger;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const defaultCreateLogger = () => () => {};

export default class SubscriptionServer<TContext, TCredentials> {
  config: SubscriptionServerConfig<TContext, TCredentials>;

  log: Logger;

  io: IoServer.Server;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    this.config = config;

    const createLogger: CreateLogger =
      config.createLogger || defaultCreateLogger;
    this.log = createLogger('@4c/SubscriptionServer::Server');

    this.io = IoServer({
      serveClient: false,
      path: this.config.path,
      transports: ['websocket'],
      wsEngine: 'ws',
    });

    this.io.on('connection', this.handleConnection);
  }

  attach(httpServer: any) {
    this.io.attach(httpServer);
  }

  handleConnection = (socket: IoServer.Socket) => {
    this.log('debug', 'new socket connection');

    const request = Object.create(express.request);
    Object.assign(request, socket.request);

    const { createContext } = this.config;

    // eslint-disable-next-line no-new
    new AuthorizedSocketConnection<TContext, TCredentials>(socket, {
      schema: this.config.schema,
      subscriber: this.config.subscriber,
      credentialsManager: this.config.createCredentialsManager(request),
      hasPermission: this.config.hasPermission,
      createContext:
        createContext && (credentials => createContext(request, credentials)),
      maxSubscriptionsPerConnection: this.config.maxSubscriptionsPerConnection,
      createValidationRules: this.config.createValidationRules,
      createLogger: this.config.createLogger || defaultCreateLogger,
    });
  };

  async close() {
    await promisify(this.io.close.bind(this))();
  }
}
