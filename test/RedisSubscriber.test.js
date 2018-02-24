/* @flow */

import RedisSubscriber from '../src/RedisSubscriber';

describe('RedisSubscriber', () => {
  it('should subscribe for messages', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber();

    const sub = client.subscribe(channel);

    client.redis.publish(channel, 'foo');

    const step = await sub.next();

    expect(step.value).toEqual('foo');

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
      let s = await sub.next();
      !s.done;
      s = await sub.next() // eslint-disable-line no-await-in-loop
    ) {
      count++;
      sub.return();
      if (count === 2) throw new Error('Should not hit here');
    }

    await client.close();
  });
});
