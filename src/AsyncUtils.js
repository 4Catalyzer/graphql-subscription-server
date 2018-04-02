/* @flow */
/* eslint-disable no-await-in-loop */

// $FlowFixMe
const SymbolAsyncIterator = Symbol.asyncIterator;

export function getIterator<T>(iterable: AsyncIterable<T>): AsyncIterator<T> {
  // $FlowFixMe
  return iterable[SymbolAsyncIterator]();
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
  predicate: (value: T) => boolean,
): AsyncGenerator<T, void, void> {
  for await (const value of iterable) {
    if (predicate((value: any))) yield value;
  }
}

export type AsyncQueueOptions = {
  setup?: () => void,
  teardown?: () => void,
};

export class AsyncQueue {
  values: any[];
  cleanedUp: boolean = false;
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
    if (this.cleanedUp) return;
    this.cleanedUp = true;
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
        await this.promise; // eslint-disable-line no-unused-expressions

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
