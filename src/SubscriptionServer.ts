import { promisify } from 'util';

import express from 'express';
import type { GraphQLSchema } from 'graphql';
import type { Server, Socket } from 'socket.io';

import AuthorizedSocketConnection from './AuthorizedSocketConnection.js';
import type { CreateValidationRules } from './AuthorizedSocketConnection.js';
import type { CredentialsManager } from './CredentialsManager.js';
import { CreateLogger, Logger, noopCreateLogger } from './Logger.js';
import type { Subscriber } from './Subscriber.js';

let IoServerConstructor: typeof Server | null = null;

try {
  const socketIoModule = await import('socket.io');
  IoServerConstructor = socketIoModule.Server;
} catch {
  IoServerConstructor = null;
}

export type SubscriptionServerConfig<TContext, TCredentials> = {
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
  socketIoServer?: Server;
};

export default class SubscriptionServer<TContext, TCredentials> {
  config: SubscriptionServerConfig<TContext, TCredentials>;

  log: Logger;

  io: Server;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    this.config = config;

    const createLogger = config.createLogger || noopCreateLogger;
    this.log = createLogger('SubscriptionServer');

    this.io = config.socketIoServer!;
    if (!this.io) {
      if (!IoServerConstructor) {
        throw new Error(
          'socket.io is required when socketIoServer is not provided',
        );
      }

      this.io = new IoServerConstructor({
        serveClient: false,
        path: this.config.path,
        transports: ['websocket'],
        allowEIO3: true,
      });
    }

    this.io.on('connection', this.handleConnection);
  }

  attach(httpServer: any) {
    this.io.attach(httpServer);
  }

  handleConnection = (socket: Socket) => {
    const clientId = socket.id;

    this.log('debug', 'new socket connection', {
      clientId,
      numClients: this.io.engine?.clientsCount ?? 0,
    });

    const request = Object.create((express as any).request);
    Object.assign(request, socket.request);

    const { createContext } = this.config;

    // eslint-disable-next-line no-new
    new AuthorizedSocketConnection(socket, {
      schema: this.config.schema,
      subscriber: this.config.subscriber,
      credentialsManager: this.config.createCredentialsManager(request),
      hasPermission: this.config.hasPermission,
      createContext:
        createContext &&
        ((credentials: TCredentials | null | undefined) =>
          createContext(request, credentials)),
      maxSubscriptionsPerConnection: this.config.maxSubscriptionsPerConnection,
      createValidationRules: this.config.createValidationRules,
      createLogger: this.config.createLogger || noopCreateLogger,
    });

    // add after so the logs happen in order
    socket.once('disconnect', (reason) => {
      this.log('debug', 'socket disconnected', {
        reason,
        clientId,
        numClients: (this.io.engine.clientsCount ?? 0) - 1, // number hasn't decremented at this point for this client
      });
    });
  };

  async close() {
    // @ts-ignore
    await promisify((...args) => this.io.close(...args))();
  }
}
