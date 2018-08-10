/** @flow */

export interface Subscriber {
  subscribe(...any[]): Promise<AsyncIterable<any>>;
  close(): void | Promise<void>;
}
