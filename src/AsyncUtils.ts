/* eslint-disable no-await-in-loop */

import { Logger } from './Logger';

export async function* createAsyncIterable<T>(values: T[]) {
  for (const value of values) yield value;
}

export async function* map<T, U>(
  iterable: AsyncIterable<T>,
  mapper: (value: T) => U,
): AsyncGenerator<U, void, void> {
  for await (const value of iterable) {
    yield mapper(value);
  }
}

export async function* filter<T>(
  iterable: AsyncIterable<T>,
  predicate: (value: T) => Promise<boolean> | boolean,
): AsyncGenerator<T, void, void> {
  for await (const value of iterable) {
    if (await predicate(value)) yield value;
  }
}

export type AsyncQueueOptions = {
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  log?: Logger;
};

export class AsyncQueue {
  options: AsyncQueueOptions;

  values: any[];

  promise!: Promise<void>;

  resolvePromise!: () => void;

  closed: boolean;

  iterator: Promise<AsyncIterableIterator<any>>;

  setupPromise!: void | Promise<void>;

  constructor(options: AsyncQueueOptions = {}) {
    this.options = options;

    this.values = [];
    this.createPromise();

    this.closed = false;
    this.iterator = this.createIterator();
  }

  createPromise() {
    this.promise = new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  async createIterator(): Promise<AsyncIterableIterator<any>> {
    const iterator = this.createIteratorRaw();

    // Wait for setup.
    await iterator.next();
    return iterator;
  }

  async *createIteratorRaw(): AsyncGenerator<any> {
    if (this.options.setup) {
      this.setupPromise = this.options.setup();
    }

    if (this.setupPromise) {
      await this.setupPromise;
    }
    // this is dummy value yielded so we can await the first `.next()`
    // call of the iterable, ensuring that the setup code has completed
    yield null;

    while (true) {
      await this.promise;

      for (const value of this.values) {
        if (this.closed) {
          return;
        }

        yield value;
      }

      this.values.length = 0;
      this.createPromise();
    }
  }

  push(value: any) {
    this.values.push(value);
    this.resolvePromise();
  }

  close = async (): Promise<void> => {
    if (this.setupPromise) {
      await this.setupPromise;
    }

    if (this.options.teardown) {
      await this.options.teardown();
    }

    this.closed = true;
    this.push(null);
  };
}
