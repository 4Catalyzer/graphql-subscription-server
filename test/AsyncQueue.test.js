/* @flow */

import { AsyncQueue, map } from '../src/AsyncUtils';

describe('AsyncQueue', () => {
  it('should push to queue', async () => {
    const queue = new AsyncQueue();

    queue.push(5);
    queue.push(4);

    const iter = await queue.iterator;

    let step = await iter.next();
    expect(step.value).toEqual(5);

    step = await iter.next();
    expect(step.value).toEqual(4);
  });

  it('should perform setup when queue is created', async () => {
    const setupSpy = jest.fn();
    const teardownSpy = jest.fn();
    const _ = new AsyncQueue({ setup: setupSpy, teardown: teardownSpy });

    expect(setupSpy).toHaveBeenCalled();
    expect(teardownSpy).not.toHaveBeenCalled();
  });

  it('should clean up when closed', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue({ teardown: spy });
    const iter = await queue.iterator;

    queue.push(5);
    await iter.next();
    await iter.close();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should always call teardown with setup', async () => {
    const setupSpy = jest.fn();
    const teardownSpy = jest.fn();

    const queue = new AsyncQueue({ setup: setupSpy, teardown: teardownSpy });
    queue.push(5);

    const closeableIter = await queue.iterator;
    const iter = map(closeableIter, v => v + 1);

    expect((await iter.next()).value).toEqual(6);

    await closeableIter.close();

    expect(setupSpy).toHaveBeenCalled();
    expect(teardownSpy).toHaveBeenCalled();
  });
});
