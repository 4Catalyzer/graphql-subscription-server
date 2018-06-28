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
  iterable: Promise<AsyncIterable<T>>,
  predicate: (value: T) => boolean,
): AsyncGenerator<T, void, void> {
  for await (const value of await iterable) {
    if (predicate(value)) yield value;
  }
}

export type AsyncQueueOptions = {
  setup?: () => void,
  teardown?: () => void,
};

export class AsyncQueue {
  values: any[];
  closed: boolean = false;
  promise: Promise<void>;
  options: AsyncQueueOptions;
  resolvePromise: () => void;
  iterable: AsyncGenerator<any, void, void>;

  constructor(options?: AsyncQueueOptions = {}) {
    this.values = [];
    this.options = options;
    this.createPromise();

    this.iterable = this.createIterable(options.setup);
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

  async *createIterable(setup: ?() => void): AsyncGenerator<any, void, void> {
    try {
      if (setup) await setup();

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

  push(value: any) {
    this.values.push(value);
    this.resolvePromise();
  }
}
