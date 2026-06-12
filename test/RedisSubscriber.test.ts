import RedisSubscriber from '../src/RedisSubscriber.js';
import SubscriptionContext from '../src/SubscriptionContext.js';
import { CreateLogger } from '../src/index.js';

describe('RedisSubscriber', () => {
  it('should subscribe for messages', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber();

    const subscriptionContext = new SubscriptionContext(client);
    const sub = await subscriptionContext.subscribe(channel);

    client.redis.publish(channel, 'foo');

    const step = await sub.next();

    expect(step.value).toEqual('foo');

    await client.close();
  });

  it('should accept parseMessage', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber({ parseMessage: (d) => JSON.parse(d) });

    const subscriptionContext = new SubscriptionContext(client);
    const sub = await subscriptionContext.subscribe(channel);

    client.redis.publish(channel, '[1,2,3]');

    const step = await sub.next();

    expect(step.value).toEqual([1, 2, 3]);

    await client.close();
  });

  it('should accept parseMessage per channel', async () => {
    const channel = 'whatever';
    const client = new RedisSubscriber();

    const subscriptionContext = new SubscriptionContext(client);
    const subA = await subscriptionContext.subscribe(channel, {
      parseMessage: JSON.parse,
    });
    const subB = await subscriptionContext.subscribe('another');

    client.redis.publish(channel, '[1,2,3]');
    client.redis.publish('another', '[1,2,3]');

    const stepA = await subA.next();
    const stepB = await subB.next();

    expect(stepA.value).toEqual([1, 2, 3]);
    expect(stepB.value).toEqual('[1,2,3]');

    await client.close();
  });

  it('should remove subscribers', async () => {
    const channel = 'channel';
    const client = new RedisSubscriber();

    const subscriptionContext = new SubscriptionContext(client);
    const sub = await subscriptionContext.subscribe(channel);

    client.redis.publish(channel, '');
    client.redis.publish(channel, '');

    let count = 0;
    for await (const _ of sub) {
      count++;
      await subscriptionContext.close();
      if (count === 2) throw new Error('Should not hit here');
    }

    await client.close();
  });

  it('should use provided logger', async () => {
    const channel = 'A redis topic';
    const logs = [] as any[];
    const createLogger: CreateLogger = (group) => (level, message, meta) =>
      logs.push({ group, level, message, meta });

    const client = new RedisSubscriber({ createLogger });

    const subscriptionContext = new SubscriptionContext(client);

    await subscriptionContext.subscribe(channel);
    await subscriptionContext.subscribe(channel);

    client.redis.publish(channel, 'hey');

    await subscriptionContext.close();

    await client.close();

    expect(logs).toMatchInlineSnapshot(`
     [
       {
         "group": "RedisSubscriber",
         "level": "debug",
         "message": "Channel subscribed",
         "meta": {
           "channel": "A redis topic",
         },
       },
       {
         "group": "RedisSubscriber",
         "level": "debug",
         "message": "Channel already subscribed to",
         "meta": {
           "channel": "A redis topic",
         },
       },
       {
         "group": "RedisSubscriber",
         "level": "silly",
         "message": "message received",
         "meta": {
           "channel": "A redis topic",
           "message": "hey",
         },
       },
       {
         "group": "RedisSubscriber",
         "level": "debug",
         "message": "Channel subscriber unsubscribed",
         "meta": {
           "channel": "A redis topic",
           "numSubscribersForChannelRemaining": 1,
         },
       },
       {
         "group": "RedisSubscriber",
         "level": "debug",
         "message": "Channel subscriber unsubscribed",
         "meta": {
           "channel": "A redis topic",
           "numSubscribersForChannelRemaining": 0,
         },
       },
       {
         "group": "RedisSubscriber",
         "level": "silly",
         "message": "closed",
         "meta": {
           "numChannels": 0,
           "numQueus": 0,
         },
       },
     ]
    `);
  });
});
