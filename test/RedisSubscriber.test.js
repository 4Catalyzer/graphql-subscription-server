/* @flow */

import RedisSubscriber from '../src/RedisSubscriber';

describe('RedisSubscriber', () => {
  it('should subscribe for messages', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber();

    const sub = client.subscribe(channel);

    client.redis.publish(channel, 'foo');

    const step = await sub.iterable.next();

    expect(step.value).toEqual('foo');

    await client.close();
  });

  it('should accept parseMessage', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber({ parseMessage: d => JSON.parse(d) });

    const sub = client.subscribe(channel);

    client.redis.publish(channel, '[1,2,3]');

    const step = await sub.iterable.next();

    expect(step.value).toEqual([1, 2, 3]);

    await client.close();
  });

  it('should accept parseMessage per channel', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber();

    const subA = client.subscribe(channel, d => JSON.parse(d));
    const subB = client.subscribe('another');

    client.redis.publish(channel, '[1,2,3]');
    client.redis.publish('another', '[1,2,3]');

    const stepA = await subA.iterable.next();
    const stepB = await subB.iterable.next();

    expect(stepA.value).toEqual([1, 2, 3]);
    expect(stepB.value).toEqual('[1,2,3]');

    await client.close();
  });

  it('should remove subscribers', async () => {
    const channel = 'channel';
    const client = new RedisSubscriber();

    const sub = client.subscribe(channel);

    client.redis.publish(channel, '');
    client.redis.publish(channel, '');

    let count = 0;
    for (
      let s = await sub.iterable.next();
      !s.done;
      s = await sub.iterable.next() // eslint-disable-line no-await-in-loop
    ) {
      count++;
      await sub.iterable.return();
      if (count === 2) throw new Error('Should not hit here');
    }

    await client.close();
  });
});
