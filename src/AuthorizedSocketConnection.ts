import {
  GraphQLError,
  GraphQLSchema,
  ValidationContext,
  createSourceEventStream,
  execute,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import { ExecutionResult } from 'graphql/execution/execute';
import io from 'socket.io';

import * as AsyncUtils from './AsyncUtils';
import { CredentialsManager } from './CredentialsManager';
import { CreateLogger, Logger } from './Logger';
import { Subscriber } from './Subscriber';
import SubscriptionContext from './SubscriptionContext';

export type CreateValidationRules = ({
  query,
  variables,
}: {
  query: string;
  variables: Record<string, unknown>;
}) => ReadonlyArray<(context: ValidationContext) => any>;

interface Subscription {
  id: string;
  query: string;
  variables: Record<string, unknown>;
}

interface SubscribeOptions<TCredentials> {
  hasPermission?: (data: any, credentials: TCredentials) => boolean;
}

interface AuthorizedSocketOptions<TContext, TCredentials> {
  schema: GraphQLSchema;
  subscriber: Subscriber<any>;
  credentialsManager: CredentialsManager<TCredentials>;
  hasPermission: (data: any, credentials: TCredentials) => boolean;
  createContext:
    | ((credentials: TCredentials | null | undefined) => TContext)
    | null
    | undefined;
  maxSubscriptionsPerConnection: number | null | undefined;
  createValidationRules: CreateValidationRules | null | undefined;
  createLogger: CreateLogger;
}

const acknowledge = (cb?: () => void) => {
  if (cb) cb();
};

/**
 * AuthorizedSocketConnection manages a socket connection for a single user.
 *
 * It includes:
 * - Authorization
 * - Authentication
 * - Rudimentary connection constraints (max connections)
 */
export default class AuthorizedSocketConnection<TContext, TCredentials> {
  socket: io.Socket;

  config: AuthorizedSocketOptions<TContext, TCredentials>;

  log: Logger;

  subscriptionContexts: Map<
    string,
    SubscriptionContext<SubscribeOptions<TCredentials>>
  >;

  constructor(
    socket: io.Socket,
    config: AuthorizedSocketOptions<TContext, TCredentials>,
  ) {
    this.socket = socket;
    this.config = config;

    this.log = config.createLogger('@4c/SubscriptionServer::AuthorizedSocket');
    this.subscriptionContexts = new Map();

    this.socket
      .on('authenticate', this.handleAuthenticate)
      .on('subscribe', this.handleSubscribe)
      .on('unsubscribe', this.handleUnsubscribe)
      .on('connect', this.handleConnect)
      .on('disconnect', this.handleDisconnect);
  }

  emitError(error: { code: string; data?: any }) {
    this.socket.emit('app_error', error);
  }

  async isAuthorized(
    data: any,
    hasPermission: (data: any, credentials: TCredentials) => boolean,
  ) {
    const credentials = await this.config.credentialsManager.getCredentials();
    const isAuthorized = !!credentials && hasPermission(data, credentials);
    if (!isAuthorized) {
      this.log('info', 'unauthorized', {
        payload: data,
        credentials,
      });
    }
    return isAuthorized;
  }

  hasPermission = (data: any, credentials: TCredentials) => {
    return this.config.hasPermission(data, credentials);
  };

  handleAuthenticate = async (authorization: string, cb?: () => void) => {
    try {
      this.log('debug', 'authenticating connection', {
        clientId: this.socket.id,
      });

      await this.config.credentialsManager.authenticate(authorization);
    } catch (err) {
      this.log('error', err.message, err);
      this.emitError({ code: 'invalid_authorization' });
    }

    acknowledge(cb);
  };

  /**
   * Handle user requesting a subscription.
   */
  handleSubscribe = async (
    { id, query, variables }: Subscription,
    cb?: () => void,
  ) => {
    let document;
    let resultOrStream: AsyncIterable<any> | ExecutionResult;

    try {
      if (
        this.config.maxSubscriptionsPerConnection != null &&
        this.subscriptionContexts.size >=
          this.config.maxSubscriptionsPerConnection
      ) {
        this.log('debug', 'subscription limit reached', {
          maxSubscriptionsPerConnection: this.config
            .maxSubscriptionsPerConnection,
        });
        this.emitError({
          code: 'subscribe_failed.subscription_limit',
        });
        return;
      }

      if (this.subscriptionContexts.has(id)) {
        this.log('debug', 'duplicate subscription attempted', { id });

        this.emitError({
          code: 'invalid_id.duplicate',
          data: id,
        });

        return;
      }

      document = parse(query);
      const validationRules = [
        ...specifiedRules,
        ...(this.config.createValidationRules
          ? this.config.createValidationRules({ query, variables })
          : []),
      ];
      const validationErrors = validate(
        this.config.schema,
        document,
        validationRules,
      );

      if (validationErrors.length) {
        this.emitError({
          code: 'subscribe_failed.document_error',
          data: validationErrors,
        });
        return;
      }

      const subscriptionContext = new SubscriptionContext(
        this.config.subscriber,
      );

      const sourcePromise = createSourceEventStream(
        this.config.schema,
        document,
        null,
        {
          subscribe: async (
            topic: string,
            {
              hasPermission = this.config.hasPermission,
              ...options
            }: SubscribeOptions<TCredentials> = {},
          ) => {
            return AsyncUtils.filter(
              await subscriptionContext.subscribe(topic, options),
              (data) => this.isAuthorized(data, hasPermission),
            );
          },
          subscriber: this.config.subscriber,
        },
        variables,
      );

      this.subscriptionContexts.set(id, subscriptionContext);

      try {
        resultOrStream = await sourcePromise;
      } catch (err) {
        if (err instanceof GraphQLError) {
          resultOrStream = { errors: [err] };
        } else {
          this.subscriptionContexts.delete(id);
          throw err;
        }
      }

      if ((resultOrStream as ExecutionResult).errors != null) {
        this.subscriptionContexts.delete(id);
        this.emitError({
          code: 'subscribe_failed.gql_error',
          data: (resultOrStream as ExecutionResult).errors,
        });

        return;
      }
    } finally {
      acknowledge(cb);
      this.log('debug', 'client subscribed', {
        id,
        query,
        variables,
        clientId: this.socket.id,
      });
    }

    const stream: AsyncIterable<unknown> = resultOrStream as any;

    for await (const payload of stream) {
      const credentials = await this.config.credentialsManager.getCredentials();

      let response;
      try {
        response = await execute(
          this.config.schema,
          document,
          payload,
          this.config.createContext && this.config.createContext(credentials),
          variables,
        );
      } catch (e) {
        if (e instanceof GraphQLError) {
          response = { errors: [e] };
        } else {
          throw e;
        }
      }

      this.log('info', 'emit', { response, credentials });

      this.socket.emit('subscription update', { id, ...response });
    }
  };

  handleConnect = () => {
    this.log('debug', 'client connected', { clientId: this.socket.id });
  };

  handleUnsubscribe = async (id: string, cb?: () => void) => {
    const subscriptionContext = this.subscriptionContexts.get(id);
    if (!subscriptionContext) {
      return;
    }

    this.log('debug', 'client unsubscribed', { id, clientId: this.socket.id });

    await subscriptionContext.close();
    this.subscriptionContexts.delete(id);

    acknowledge(cb);
  };

  handleDisconnect = async () => {
    this.log('debug', 'client disconnected', { clientId: this.socket.id });

    await Promise.all([
      this.config.credentialsManager.unauthenticate(),
      ...Array.from(
        this.subscriptionContexts.values(),
        (subscriptionContext) => subscriptionContext.close(),
      ),
    ]);
  };
}
