import { Request } from 'express';
import type { GraphQLSchema } from 'graphql';
import type { Server, Socket } from 'socket.io';

import AuthorizedSocketConnection from './AuthorizedSocketConnection';
import type { CreateValidationRules } from './AuthorizedSocketConnection';
import type { CredentialsManager } from './CredentialsManager';
import { CreateLogger, Logger, noopCreateLogger } from './Logger';
import type { Subscriber } from './Subscriber';
import { WebSocket } from './types';

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

export default abstract class SubscriptionServer<TContext, TCredentials> {
  config: SubscriptionServerConfig<TContext, TCredentials>;

  log: Logger;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    this.config = config;

    const createLogger: CreateLogger = config.createLogger || noopCreateLogger;

    this.log = createLogger('SubscriptionServer');
  }

  public abstract attach(httpServer: any): void;

  protected opened(socket: WebSocket, request: Request) {
    this.log('debug', 'new socket connection');

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
  }

  abstract close(): void | Promise<void>;
}
