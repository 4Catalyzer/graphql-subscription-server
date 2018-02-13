/* @flow */

import {
  parse,
  subscribe,
  type ExecutionResult,
  type GraphQLSchema,
} from 'graphql';
import IoServer from 'socket.io';

import * as AsyncUtils from './AsyncUtils';
import type RedisSubscriber from './RedisSubscriber';
import type { ICredentialsManager } from './CredentialManager';

type Subscription = {
  id: string,
  query: string,
  variables: Object,
};

type MaybeSubscription = Promise<
  AsyncIterator<ExecutionResult> | ExecutionResult,
>;

type ServerConfig<TContext, TCredentials> = {|
  socket: IoServer.socket,
  redis: RedisSubscriber,
  schema: GraphQLSchema,
  context: TContext,
  credentialsManager: ICredentialsManager<TCredentials>,
  hasPermission: (data: any, credentials: TCredentials) => boolean,
  defaultParseMessage: (data: string) => any,
  maxSubscriptionsPerConnection?: number,
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
  config: ServerConfig<TContext, TCredentials>;

  subscriptions: Map<string, MaybeSubscription>;
  renewTimer: ?TimeoutID = null;

  constructor(config: ServerConfig<TContext, TCredentials>) {
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
      await this.config.credentialsManager.authenticate(authorization);
    } catch (err) {
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
        subscribe: async (
          channel,
          parseMessage = this.config.defaultParseMessage,
        ) => {
          const source = this.config.redis.subscribe(channel);
          const parsed = AsyncUtils.map(source, parseMessage);
          const filtered = AsyncUtils.filter(parsed, this.isAuthorized);
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

    const subscription: AsyncIterator<ExecutionResult> = (result: any);
    for (
      let step = await subscription.next();
      !step.done;
      step = await subscription.next() // eslint-disable-line no-await-in-loop
    ) {
      const payload = step.value;
      this.config.socket.emit('subscription update', { id, ...payload });
    }
  };

  handleUnsubscribe = async (id: string) => {
    const subscription = await this.subscriptions.get(id);
    if (subscription && typeof subscription.return === 'function') {
      subscription.return();
    }
    this.subscriptions.delete(id);
  };

  handleDisconnect = () => {
    if (this.renewTimer) {
      clearTimeout(this.renewTimer);
    }

    this.subscriptions.forEach(async subscriptionPromise => {
      const subscription = await subscriptionPromise;

      if (subscription && typeof subscription.return === 'function') {
        subscription.return();
      }
    });
  };
}
