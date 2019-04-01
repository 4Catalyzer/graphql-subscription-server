/** @flow */

export interface Subscriber {
  subscribe(
    topic: string,
    options: Object,
  ): { iterator: Promise<AsyncIterator<any>>, close: () => Promise<void> };
  close(): void | Promise<void>;
}
