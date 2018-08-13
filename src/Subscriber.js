/** @flow */

export interface Subscriber {
  subscribe(
    ...any[]
  ): { iterator: Promise<AsyncIterator<any>>, close: () => Promise<void> };
  close(): void | Promise<void>;
}
