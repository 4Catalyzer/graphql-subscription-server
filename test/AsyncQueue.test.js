/* @flow */

import { AsyncQueue } from '../src/AsyncUtils';

describe('AsyncQueue', () => {
  it('should push to queue', async () => {
    const queue = new AsyncQueue(() => {});

    queue.push(5);
    queue.push(4);

    let step = await queue.iterable.next();
    expect(step.value).toEqual(5);
    step = await queue.iterable.next();
    expect(step.value).toEqual(4);
  });

  it('should clean up when closed', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue(spy);

    queue.push(5);
    await queue.close();

    // fails
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('should clean up when returned', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue(spy);

    queue.push(5);
    await queue.iterable.next();
    await queue.iterable.return();

    // fails
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('should clean up once', async () => {
    const spy = jest.fn();
    const queue = new AsyncQueue(spy);

    queue.push(5);
    await queue.iterable.next(); // start generator so finally block is hit
    await queue.iterable.return();

    // fails
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
