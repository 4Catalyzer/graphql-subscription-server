/* @flow */

import redis from 'redis';
import { promisify } from 'util';

import { AsyncQueue, map } from './AsyncUtils';
import type { Subscriber } from './Subscriber';

type Channel = string;

type RedisConfigOptions = redis.ClientOpts & {
  parseMessage?: (data: string) => any,
};

export default class RedisSubscriber implements Subscriber {
  redis: redis.RedisClient;
  _parseMessage: (data: string) => any;
  _queues: Map<Channel, Set<AsyncQueue>>;
  _channels: Set<string>;

  constructor({ parseMessage, ...redisConfig }: RedisConfigOptions = {}) {
    this.redis = redis.createClient(redisConfig);
    this._queues = new Map();
    this._channels = new Set();
    this._parseMessage = parseMessage;

    this.redis.on('message', (channel, message) => {
      const queues = this._queues.get(channel);
      if (!queues) return;
      queues.forEach(queue => {
        queue.push(message);
      });
    });
  }

  _subscribeToChannel(channel: string) {
    if (this._channels.has(channel)) return;
    this._channels.add(channel);
    this.redis.subscribe(channel);
  }
  subscribe(
    channel: Channel,
    parseMessage: (data: string) => any = this._parseMessage,
  ) {
    let channelQueues = this._queues.get(channel);

    if (!channelQueues) {
      channelQueues = new Set();
      this._queues.set(channel, channelQueues);
      this.redis.subscribe(channel);
    }

    const queue = new AsyncQueue({
      setup: () => this._subscribeToChannel(channel),
      teardown: () => {
        const innerQueues = this._queues.get(channel);
        if (!innerQueues) return;

        innerQueues.delete(queue);

        if (!innerQueues.size) {
          this.redis.unsubscribe(channel);
          this._channels.delete(channel);
          this._queues.delete(channel);
        }
      },
    });

    channelQueues.add(queue);
    if (!parseMessage) return queue.iterable;

    return map(queue.iterable, parseMessage);
  }

  async close() {
    await promisify((...args) => this.redis.quit(...args))();
  }
}
