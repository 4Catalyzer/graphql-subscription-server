/* @flow */

import type { Subscriber } from './Subscriber';

export default class SubscriptionContext {
  subscriber: Subscriber;
  closes: Array<() => Promise<void>>;

  constructor(subscriber: Subscriber) {
    this.subscriber = subscriber;
    this.closes = [];
  }

  subscribe(...args: any[]): Promise<AsyncIterator<any>> {
    const { iterator, close } = this.subscriber.subscribe(...args);
    this.closes.push(close);
    return iterator;
  }

  async close(): Promise<void> {
    await Promise.all(this.closes.map(close => close()));
  }
}
