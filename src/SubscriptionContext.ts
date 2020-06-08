import { Subscriber } from './Subscriber';

export default class SubscriptionContext<TSubscriberOptions> {
  subscriber: Subscriber<TSubscriberOptions>;

  closes: Array<() => Promise<void>>;

  constructor(subscriber: Subscriber<any>) {
    this.subscriber = subscriber;
    this.closes = [];
  }

  subscribe(
    topic: string,
    options?: TSubscriberOptions,
  ): Promise<AsyncIterableIterator<any>> {
    const { iterator, close } = this.subscriber.subscribe(topic, options);
    this.closes.push(close);
    return iterator;
  }

  async close(): Promise<void> {
    await Promise.all(this.closes.map((close) => close()));
  }
}
