/* @flow */

import {
  parse,
  subscribe,
  type ExecutionResult,
  type GraphQLSchema,
} from 'graphql';
import IoServer from 'socket.io';

import type { Subscriber } from './Subscriber';

type Subscription = {
  id: string,
  query: string,
  variables: Object,
};

type MaybeSubscription = Promise<
  AsyncIterator<ExecutionResult> | ExecutionResult,
>;

export type SocketOptions<TContext> = {|
  socket: IoServer.socket,
  subscriber: Subscriber,
  schema: GraphQLSchema,
  context: TContext,
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
export default class SocketConnection<TContext> {
  config: SocketOptions<TContext>;

  subscriptions: Map<string, MaybeSubscription>;

  constructor(config: SocketOptions<TContext>) {
    this.config = config;
    this.subscriptions = new Map();
    this.config.socket
      .on('subscribe', this.handleSubscribe)
      .on('unsubscribe', this.handleUnsubscribe)
      .on('disconnect', this.handleDisconnect);
  }

  subscribe(...args: any[]) {
    return this.config.subscriber.subscribe(...args);
  }

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
        subscribe: (...args) => this.subscribe(...args),
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
    this.subscriptions.forEach(async subscriptionPromise => {
      const subscription = await subscriptionPromise;

      if (subscription && typeof subscription.return === 'function') {
        subscription.return();
      }
    });
  };
}
