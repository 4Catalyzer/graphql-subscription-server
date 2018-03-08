/* @flow */

import { isAsyncIterable } from 'iterall';

import { AsyncQueue } from '../src/AsyncUtils';

describe('AsyncUtils', () => {
  describe('AsyncQueue', () => {
    describe('iterable', () => {
      it('should be an async iterable', () => {
        const queue = new AsyncQueue(() => {});
        expect(isAsyncIterable(queue.iterable)).toBe(true);
      });
    });
  });
});
