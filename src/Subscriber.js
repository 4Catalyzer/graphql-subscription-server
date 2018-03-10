/** @flow */

export interface Subscriber {
  subscribe(
    ...any[]
  ): {
    close(): void | Promise<void>,
    iterable: AsyncGenerator<any, void, void>,
  };
  close(): void | Promise<void>;
}
