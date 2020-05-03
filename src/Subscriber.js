/* @flow */

export interface Subscriber<TSubscriberOptions: {}> {
  subscribe(
    topic: string,
    options: TSubscriberOptions,
  ): { iterator: Promise<AsyncIterator<any>>, close: () => Promise<void> };
  close(): void | Promise<void>;
}
