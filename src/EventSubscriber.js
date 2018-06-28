/* @flow */

import type EventEmitter from 'events';

import { AsyncQueue } from './AsyncUtils';
import type { Subscriber } from './Subscriber';

/**
 * A subscriber over a standard EventEmitter. Events are pushed as
 * they received, passing through, the _first_ argument of the event handler.
 * Events are listened to at the time of subscription, meaning only event past then will be received.
 */
export default class EventSubscriber implements Subscriber {
  emitter: EventEmitter;

  _queues: Map<string, Set<AsyncQueue>>;
  _listeners: Map<string, Function>;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
    this._queues = new Map();
    this._listeners = new Map();
  }

  _listen(event: string) {
    if (this._listeners.has(event)) return;

    const listener = data => {
      const queues = this._queues.get(event);
      if (!queues) return;
      queues.forEach(queue => {
        queue.push(data);
      });
    };

    this.emitter.on(event, listener);
    this._listeners.set(event, listener);
  }

  async subscribe(event: string) {
    let eventQueues = this._queues.get(event);

    if (!eventQueues) {
      eventQueues = new Set();
      this._queues.set(event, eventQueues);
    }

    const queue = new AsyncQueue({
      setup: () => this._listen(event),
      teardown: () => {
        const innerQueues = this._queues.get(event);
        if (!innerQueues) return;

        innerQueues.delete(queue);

        if (!innerQueues.size) {
          this._queues.delete(event);
        }
      },
    });

    eventQueues.add(queue);

    return queue.iterable;
  }

  async close() {
    this._listeners.forEach((fn, event) => {
      this.emitter.removeListener(event, fn);
    });
  }
}
