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
  setup?: () => Promise<void> | void,
  teardown?: () => void,
};

export class AsyncQueue {
  values: any[];
  closed: boolean = false;
  promise: Promise<void>;
  options: AsyncQueueOptions;
  resolvePromise: () => void;
  iterable: Promise<AsyncGenerator<any, void, void>>;

  constructor(options?: AsyncQueueOptions = {}) {
    this.values = [];
    this.options = options;
    this.createPromise();

    this.iterable = this.createIterable();
  }

  close(): void | Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.options.teardown) this.options.teardown();
  }

  createPromise() {
    this.promise = new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }

  async *createIterableRaw(): AsyncGenerator<any, void, void> {
    try {
      if (this.options.setup) await this.options.setup();
      yield null;

      while (true) {
        await this.promise;

        for (const value of this.values) {
          yield value;
        }

        this.values.length = 0;
        this.createPromise();
      }
    } finally {
      await this.close();
    }
  }

  async createIterable(): Promise<AsyncGenerator<any, void, void>> {
    const iterableRaw = this.createIterableRaw();

    // wait for the first synthetic yield after setup
    await iterableRaw.next();

    return iterableRaw;
  }

  push(value: any) {
    this.values.push(value);
    this.resolvePromise();
  }
}
