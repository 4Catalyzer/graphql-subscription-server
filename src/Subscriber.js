/** @flow */

export interface Subscriber<TSubscribeOptions: {}> {
  subscribe(
    topic: string,
    options: TSubscribeOptions,
  ): { iterator: Promise<AsyncIterator<any>>, close: () => Promise<void> };
  close(): void | Promise<void>;
}
