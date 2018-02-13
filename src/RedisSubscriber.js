/* @flow */

import redis from 'redis';
import { promisify } from 'util';

import { AsyncQueue } from './AsyncUtils';

type Channel = string;

export default class RedisSubscriber {
  redis: redis.RedisClient;
  _queues: Map<Channel, Set<AsyncQueue>>;

  constructor(redisConfig: redis.ClientOpts) {
    this.redis = redis.createClient(redisConfig);
    this._queues = new Map();

    this.redis.on('message', (channel, message) => {
      const queues = this._queues.get(channel);
      if (!queues) return;
      queues.forEach(queue => {
        queue.push(message);
      });
    });
  }

  subscribe(channel: Channel) {
    let channelQueues = this._queues.get(channel);

    if (!channelQueues) {
      channelQueues = new Set();
      this._queues.set(channel, channelQueues);
      this.redis.subscribe(channel);
    }

    const queue = new AsyncQueue(() => {
      const innerQueues = this._queues.get(channel);
      if (!innerQueues) return;

      innerQueues.delete(queue);

      if (!innerQueues.size) {
        this.redis.unsubscribe(channel);
        this._queues.delete(channel);
      }
    });

    channelQueues.add(queue);
    return queue.iterable;
  }

  async close() {
    await promisify((...args) => this.redis.quit(...args))();
  }
}
