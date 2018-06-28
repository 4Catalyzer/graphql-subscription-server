/** @flow */

export interface Subscriber {
  subscribe(...any[]): Promise<AsyncGenerator<any, void, void>>;
  close(): void | Promise<void>;
}
