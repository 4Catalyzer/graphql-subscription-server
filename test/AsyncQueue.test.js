/* @flow */

import { AsyncQueue, map } from '../src/AsyncUtils';

describe('AsyncQueue', () => {
  it('should push to queue', async () => {
    const queue = new AsyncQueue();

    queue.push(5);
    queue.push(4);

    const iter = queue.iterable;

    let step = await iter.next();
    expect(step.value).toEqual(5);

    step = await iter.next();
    expect(step.value).toEqual(4);
  });

  it('should defer setup until iterator is created', async () => {
    const setupSpy = jest.fn();
    const teardownSpy = jest.fn();
    const queue = new AsyncQueue({ setup: setupSpy, teardown: teardownSpy });

    expect(setupSpy).not.toHaveBeenCalled();

    await queue.iterable.return();

    expect(setupSpy).not.toHaveBeenCalled();
    expect(teardownSpy).not.toHaveBeenCalled();
  });

  it('should clean up when returned', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue({ teardown: spy });

    queue.push(5);
    await queue.iterable.next();
    await queue.iterable.return();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should always call teardown with setup', async () => {
    const setupSpy = jest.fn();
    const teardownSpy = jest.fn();
    const queue = new AsyncQueue({ setup: setupSpy, teardown: teardownSpy });

    queue.push(5);

    const iter = map(queue.iterable, v => v + 1);

    expect((await iter.next()).value).toEqual(6);

    await iter.return();

    expect(setupSpy).toHaveBeenCalled();
    expect(teardownSpy).toHaveBeenCalled();
  });

  it('should clean up once', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue({ teardown: spy });

    queue.push(5);
    await queue.iterable.next(); // start generator so finally block is hit

    await queue.iterable.return();
    await queue.close();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
