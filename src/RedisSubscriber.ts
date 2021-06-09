import { promisify } from 'util';

import redis from 'redis';

import { AsyncQueue, map } from './AsyncUtils';
import { CreateLogger, Logger, noopCreateLogger } from './Logger';
import type { Subscriber } from './Subscriber';

type Channel = string;

export type RedisConfigOptions = redis.ClientOpts & {
  parseMessage?: (msg: string) => any;
  createLogger?: CreateLogger;
};

export type RedisSubscriberOptions = {
  parseMessage?: (msg: string) => any;
};

export default class RedisSubscriber<
  TOptions extends RedisSubscriberOptions = RedisSubscriberOptions,
> implements Subscriber<TOptions>
{
  redis: redis.RedisClient;

  _parseMessage: ((msg: string) => any) | null | undefined;

  _queues: Map<Channel, Set<AsyncQueue>>;

  _channels: Set<string>;

  private readonly log: Logger;

  constructor({
    parseMessage,
    createLogger = noopCreateLogger,
    ...redisConfig
  }: RedisConfigOptions = {}) {
    this.log = createLogger('RedisSubscriber');
    this.redis = redis.createClient(redisConfig);
    this._queues = new Map();
    this._channels = new Set();
    this._parseMessage = parseMessage;

    this.redis.on('message', (channel, message) => {
      this.log('silly', 'message received', { channel, message });
      const queues = this._queues.get(channel);
      if (!queues) {
        return;
      }

      queues.forEach((queue) => {
        queue.push(message);
      });
    });
  }

  async _subscribeToChannel(channel: string) {
    if (this._channels.has(channel)) {
      this.log('debug', 'Channel already subscribed to', { channel });
      return;
    }

    this._channels.add(channel);
    // @ts-ignore
    await promisify(this.redis.subscribe).call(this.redis, channel);
    this.log('debug', 'Channel subscribed', { channel });
  }

  subscribe(channel: Channel, options?: TOptions) {
    let channelQueues = this._queues.get(channel);
    if (!channelQueues) {
      channelQueues = new Set();
      this._queues.set(channel, channelQueues);
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
        this.log('debug', 'Channel subscriber unsubscribed', {
          channel,
          numSubscribersForChannelRemaining: innerQueues.size,
        });
      },
    });

    channelQueues.add(queue);

    let iteratorPromise = queue.iterator;

    const parseMessage = options?.parseMessage || this._parseMessage;
    if (parseMessage) {
      iteratorPromise = iteratorPromise.then((iterator) =>
        map(iterator, parseMessage),
      );
    }

    return {
      iterator: iteratorPromise,
      close: queue.close,
    };
  }

  async close() {
    await promisify(this.redis.quit).call(this.redis);
    this.log('silly', 'closed', {
      numQueus: this._queues.size,
      numChannels: this._channels.size,
    });
  }
}
