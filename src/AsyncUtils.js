/* @flow */
/* eslint-disable no-await-in-loop */

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
  predicate: (value: T) => boolean,
): AsyncGenerator<T, void, void> {
  for await (const value of iterable) {
    if (predicate(value)) yield value;
  }
}

export type AsyncQueueOptions = {
  setup?: () => void | Promise<void>,
  teardown?: () => void | Promise<void>,
};

export class AsyncQueue {
  options: AsyncQueueOptions;

  values: any[];

  promise: Promise<void>;

  resolvePromise: () => void;

  closed: boolean;

  iterator: Promise<AsyncIterator<any>>;

  setupPromise: void | Promise<void>;

  constructor(options?: AsyncQueueOptions = {}) {
    this.options = options;

    this.values = [];
    this.createPromise();

    this.closed = false;
    this.iterator = this.createIterator();
  }

  createPromise() {
    this.promise = new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }

  async createIterator(): Promise<AsyncIterator<any>> {
    const iterator = this.createIteratorRaw();

    // Wait for setup.
    await iterator.next();
    return iterator;
  }

  async *createIteratorRaw(): AsyncIterator<any> {
    if (this.options.setup) {
      this.setupPromise = this.options.setup();
    }

    if (this.setupPromise) {
      await this.setupPromise;
    }

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
