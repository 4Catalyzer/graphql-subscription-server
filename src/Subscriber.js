/** @flow */

export interface Subscriber {
  subscribe(
    channel: string,
    options: Object,
  ): { iterator: Promise<AsyncIterator<any>>, close: () => Promise<void> };
  close(): void | Promise<void>;
}
