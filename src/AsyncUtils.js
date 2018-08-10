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

type CloseableAsyncIterator<T> = AsyncIterator<T> & {
  close: () => Promise<void>,
};

export class AsyncQueue {
  options: AsyncQueueOptions;

  values: any[];
  promise: Promise<void>;
  resolvePromise: () => void;

  closed: boolean;
  iterator: Promise<CloseableAsyncIterator<any>>;

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

  async createIterator(): Promise<CloseableAsyncIterator<any>> {
    const iterator = this.createIteratorRaw();

    // Wait for setup.
    await iterator.next();

    const closeableIterator: CloseableAsyncIterator<any> = (iterator: any);
    closeableIterator.close = this.close;
    return closeableIterator;
  }

  async *createIteratorRaw(): AsyncIterator<any> {
    if (this.options.setup) {
      await this.options.setup();
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
    if (this.options.teardown) {
      await this.options.teardown();
    }

    this.closed = true;
    this.push(null);
  };
}
