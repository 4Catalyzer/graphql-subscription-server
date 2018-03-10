/* @flow */
/* eslint-disable no-await-in-loop */

function getIterator<T>(iterable: AsyncIterable<T>): AsyncIterator<T> {
  // $FlowFixMe
  return iterable[Symbol.asyncIterator]();
}

export async function* map<T, U>(
  iter: AsyncIterable<T>,
  mapper: (value: T) => U,
): AsyncGenerator<U, void, void> {
  const it = getIterator(iter);

  for (let step = await it.next(); !step.done; step = await it.next()) {
    yield mapper(step.value);
  }
}

export async function* filter<T>(
  iter: AsyncIterable<T>,
  predicate: (value: T) => boolean,
): AsyncGenerator<T, void, void> {
  const it = getIterator(iter);

  for (let step = await it.next(); !step.done; step = await it.next()) {
    if (predicate((step.value: any))) yield step.value;
  }
}

export class AsyncQueue {
  values: any[];
  cleanedUp: boolean = false;
  promise: Promise<void>;
  unsubscribe: () => void;
  resolvePromise: () => void;
  iterable: AsyncGenerator<any, void, void>;

  constructor(unsubscribe: () => void) {
    this.values = [];
    this.unsubscribe = unsubscribe;
    this.createPromise();

    this.iterable = this.createIterable();
  }

  close(): void | Promise<void> {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    this.unsubscribe();
  }

  createPromise() {
    this.promise = new Promise(resolve => {
      this.resolvePromise = resolve;
    });
  }

  async *createIterable(): AsyncGenerator<any, void, void> {
    try {
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
