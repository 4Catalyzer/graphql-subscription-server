/** @flow */

export interface Subscriber {
  subscribe(...any[]): AsyncGenerator<any, void, void>;
  close(): void | Promise<void>;
}
