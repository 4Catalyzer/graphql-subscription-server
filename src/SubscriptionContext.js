/* @flow */

import type { Subscriber } from './Subscriber';

type MaybeCloseableAsyncIterable<T> = AsyncIterable<T> & {
  close?: () => Promise<void>,
};

export default class SubscriptionContext {
  subscriber: Subscriber;
  iterables: Array<Promise<MaybeCloseableAsyncIterable<any>>>;

  constructor(subscriber: Subscriber) {
    this.subscriber = subscriber;
    this.iterables = [];
  }

  subscribe(...args: any[]): Promise<AsyncIterable<any>> {
    const iterable = this.subscriber.subscribe(...args);
    this.iterables.push(iterable);
    return iterable;
  }

  async close(): Promise<void> {
    await Promise.all(
      this.iterables.map(async iterablePromise => {
        const iterable = await iterablePromise;
        if (!iterable.close) {
          return null;
        }

        return iterable.close();
      }),
    );
  }
}
