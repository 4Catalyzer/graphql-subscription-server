import { createAsyncIterable } from './AsyncUtils';
import { Logger } from './Logger';
import { Subscriber } from './Subscriber';

function emptySubscription() {
  return Promise.resolve(createAsyncIterable([]));
}

export interface SubscriptionContextOptions {
  log?: Logger;
}

export default class SubscriptionContext<TSubscriberOptions> {
  readonly subscriber: Subscriber<TSubscriberOptions>;

  readonly closes: Array<() => Promise<void>>;

  private readonly log?: Logger;

  closed = false;

  constructor(
    subscriber: Subscriber<any>,
    { log }: SubscriptionContextOptions = {},
  ) {
    this.subscriber = subscriber;
    this.closes = [];
    this.log = log;
  }

  subscribe(
    topic: string,
    options?: TSubscriberOptions,
  ): Promise<AsyncIterableIterator<any>> {
    if (this.closed) {
      this.log?.('debug', `Subscribe after closed`, { topic });
      return emptySubscription();
    }

    const { iterator, close } = this.subscriber.subscribe(topic, options);

    this.closes.push(close);

    if (this.closed) {
      return close().then(() => emptySubscription());
    }

    return iterator;
  }

  async close(): Promise<void> {
    this.closed = true;

    await Promise.all(this.closes.map((close) => close()));
  }
}
