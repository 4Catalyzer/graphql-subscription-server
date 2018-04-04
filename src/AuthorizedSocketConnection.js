/* @flow */

import { parse, subscribe } from 'graphql';
import type { ExecutionResult, GraphQLSchema } from 'graphql';
import IoServer from 'socket.io';

import * as AsyncUtils from './AsyncUtils';
import type { CredentialsManager } from './CredentialsManager';
import type { Subscriber } from './Subscriber';
import type { Logger, CreateLogger } from './Logger';

type Subscription = {
  id: string,
  query: string,
  variables: Object,
};

type MaybeSubscription = Promise<
  AsyncGenerator<ExecutionResult, void, void> | ExecutionResult,
>;

export type AuthorizedSocketOptions<TContext, TCredentials> = {|
  socket: IoServer.socket,
  subscriber: Subscriber,
  schema: GraphQLSchema,
  context: TContext,
  credentialsManager: CredentialsManager<TCredentials>,
  hasPermission: (data: any, credentials: TCredentials) => boolean,
  maxSubscriptionsPerConnection?: number,
  createLogger: CreateLogger,
|};

const acknowledge = cb => {
  if (cb) cb();
};

// AuthorizedSocketConnection manages a socket connection for a single user.
// Includes
//  - authorization,
//  - authentication,
//  - and some rudimentary connection constraints (max connections).
export default class AuthorizedSocketConnection<TContext, TCredentials> {
  config: AuthorizedSocketOptions<TContext, TCredentials>;

  log: Logger;
  subscriptions: Map<string, MaybeSubscription>;

  constructor(config: AuthorizedSocketOptions<TContext, TCredentials>) {
    this.log = config.createLogger('@4c/SubscriptionServer::AuthorizedSocket');

    this.config = config;
    this.subscriptions = new Map();
    this.config.socket
      .on('authenticate', this.handleAuthenticate)
      .on('subscribe', this.handleSubscribe)
      .on('unsubscribe', this.handleUnsubscribe)
      .on('disconnect', this.handleDisconnect);
  }

  getCredentials(): TCredentials {
    return this.config.credentialsManager.getCredentials();
  }

  isAuthorized = (data: any) =>
    !!(
      this.config.credentialsManager.isAuthenticated() &&
      this.config.hasPermission(data, this.getCredentials())
    );

  handleAuthenticate = async (authorization: string, cb?: Function) => {
    try {
      this.log('debug', 'Authenticating Socket connection');

      await this.config.credentialsManager.authenticate(authorization);
    } catch (err) {
      this.log('error', err.message, err);
      this.config.socket.emit('app_error', { code: 'invalid_authorization' });
    }
    acknowledge(cb);
  };

  // A User requests a subscription
  handleSubscribe = async (
    { id, query, variables }: Subscription,
    cb?: Function,
  ) => {
    if (this.subscriptions.has(id)) {
      this.log('debug', 'Duplicate subscription attempted', { id });

      this.config.socket.emit('app_error', {
        code: 'invalid_id.duplicate',
        detail: id,
      });

      acknowledge(cb);
      return;
    }

    if (
      this.config.maxSubscriptionsPerConnection != null &&
      this.subscriptions.size >= this.config.maxSubscriptionsPerConnection
    ) {
      this.log('error', 'Max Subscription limit reached', {
        maxSubscriptionsPerConnection: this.config
          .maxSubscriptionsPerConnection,
      });
      this.config.socket.emit('app_error', {
        code: 'subscribe_failed.subscription_limit',
      });

      acknowledge(cb);
      this.config.socket.disconnect();
      return;
    }

    const subscriptionPromise = subscribe({
      schema: this.config.schema,
      document: parse(query),
      variableValues: variables,
      contextValue: {
        ...this.config.context,
        subscribe: async (...args) => {
          const source = this.config.subscriber.subscribe(...args);
          const filtered = AsyncUtils.filter(source, this.isAuthorized);

          return filtered;
        },
      },
    });

    this.subscriptions.set(id, subscriptionPromise);

    let result;
    try {
      result = await subscriptionPromise;
    } catch (err) {
      this.subscriptions.delete(id);
      throw err;
    }

    if (result.errors != null) {
      this.subscriptions.delete(id);
      this.config.socket.emit('app_error', {
        code: 'subscribe_failed.gql_error',
        // $FlowFixMe
        data: result.errors,
      });
      return;
    }

    acknowledge(cb);

    const subscription: AsyncIterable<ExecutionResult> = (result: any);
    for await (const payload of subscription) {
      this.log('debug', 'processing subscription update', {
        id,
        payload,
      });
      this.config.socket.emit('subscription update', { id, ...payload });
    }
  };

  handleUnsubscribe = async (id: string) => {
    const subscription = await this.subscriptions.get(id);
    if (subscription && typeof subscription.return === 'function') {
      subscription.return();
    }
    this.log('debug', 'Client unsubscribed', { id });
    this.subscriptions.delete(id);
  };

  handleDisconnect = async () => {
    this.log('debug', 'Client disconnected');
    await this.config.credentialsManager.unauthenticate();

    this.subscriptions.forEach(async subscriptionPromise => {
      const subscription = await subscriptionPromise;

      if (subscription && typeof subscription.return === 'function') {
        subscription.return();
      }
    });
  };
}
