/* @flow */

import {
  parse,
  subscribe,
  type ExecutionResult,
  type GraphQLSchema,
} from 'graphql';
import IoServer from 'socket.io';

import * as asyncUtils from './asyncUtils';
import type RedisSubscriber from './RedisSubscriber';

type HttpApi = {
  setToken(token: ?string): void,
};

export type Credentials = {
  expSeconds: number,
  tenants: { [tenantId: string]: number },
};

export type Context = {
  httpApi: HttpApi,
};

type Subscription = {
  id: string,
  query: string,
  variables: Object,
};

type MaybeSubscription = Promise<
  AsyncIterator<ExecutionResult> | ExecutionResult,
>;

type ServerConfig = {|
  socket: IoServer.socket,
  redis: RedisSubscriber,
  context: { httpApi: HttpApi },
  schema: GraphQLSchema,
  hasPermission: (data: any, socketCredentials: Credentials) => boolean,
  defaultParseMessage: (data: string) => any,
  maxSubscriptionsPerConnection?: number,
  gracePeriodSeconds: number,
  fetchCredentials: (
    context: Context,
    authorization: string,
  ) => Promise<Credentials>,
|};

const SECONDS_TO_MS = 1000;

const acknowledge = cb => {
  if (cb) cb();
};

function isExpired(expSeconds: ?number): boolean {
  return expSeconds != null && !!(Date.now() > expSeconds * SECONDS_TO_MS);
}

// TenantSocketConnection manages a single socket connection for a single user.
// Includes
//  - authorization,
//  - authentication,
//  - and some rudimentary connection constraints (max connections).
export default class TenantSocketConnection {
  config: ServerConfig;

  subscriptions: Map<string, MaybeSubscription>;
  credentials: {
    expSeconds: number,
    tenants: { [tenantId: string]: number },
  };
  renewTimer: ?TimeoutID = null;

  constructor(config: ServerConfig) {
    this.config = config;
    this.credentials = { expSeconds: 0, tenants: {} };
    this.subscriptions = new Map();
    this.config.socket
      .on('authenticate', this.handleAuthenticate)
      .on('subscribe', this.handleSubscribe)
      .on('unsubscribe', this.handleUnsubscribe)
      .on('disconnect', this.handleDisconnect);
  }

  isAuthenticated = () =>
    this.credentials.tenants && !isExpired(this.credentials.expSeconds);

  isAuthorized = (data: any) =>
    !!(
      this.isAuthenticated() &&
      this.config.hasPermission(data, this.credentials)
    );

  scheduleRenew(implicitToken: string) {
    const deltaMS = this.credentials.expSeconds * SECONDS_TO_MS - Date.now();
    const deltaMSAdjusted = Math.max(
      0,
      deltaMS - this.config.gracePeriodSeconds * SECONDS_TO_MS,
    );
    this.renewTimer = setTimeout(() => {
      this.handleAuthenticate(implicitToken);
    }, deltaMSAdjusted);
  }

  async updateCredentials(implicitToken: string) {
    this.credentials = await this.config.fetchCredentials(
      this.config.context,
      implicitToken,
    );
  }

  handleAuthenticate = async (implicitToken: string, cb?: Function) => {
    try {
      await this.updateCredentials(implicitToken);
      this.scheduleRenew(implicitToken);
    } catch (err) {
      this.credentials = { tenants: {}, expSeconds: 0 };
      this.config.socket.emit('app_error', { code: 'invalid_token' });
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
        httpApi: this.config.context.httpApi,
        subscribe: async (
          channel,
          parseMessage = this.config.defaultParseMessage,
        ) => {
          const source = this.config.redis.subscribe(channel);
          const parsed = asyncUtils.map(source, parseMessage);
          const filtered = asyncUtils.filter(parsed, this.isAuthorized);
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
