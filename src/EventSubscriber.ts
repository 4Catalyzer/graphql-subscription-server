import * as EventEmitter from 'events';

import { AsyncQueue } from './AsyncUtils';
import { Subscriber } from './Subscriber';

/**
 * A subscriber over a standard EventEmitter. Events are pushed as
 * they received, passing through, the _first_ argument of the event handler.
 * Events are listened to at the time of subscription, meaning only event past then will be received.
 */
export default class EventSubscriber implements Subscriber<unknown> {
  emitter: EventEmitter;

  _queues: Map<string, Set<AsyncQueue>>;

  _listeners: Map<string, (...args: any[]) => void>;

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
    this._queues = new Map();
    this._listeners = new Map();
  }

  _listen(event: string) {
    if (this._listeners.has(event)) return;

    const listener = (data: any) => {
      const queues = this._queues.get(event);
      if (!queues) return;
      queues.forEach((queue) => {
        queue.push(data);
      });
    };

    this.emitter.on(event, listener);
    this._listeners.set(event, listener);
  }

  subscribe(event: string, _options: unknown) {
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
    return queue;
  }

  close() {
    this._listeners.forEach((fn, event) => {
      this.emitter.removeListener(event, fn);
    });
  }
}
