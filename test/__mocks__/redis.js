/* @flow */

import mock from 'redis-mock';

// redis mock doesn't fire the callback (but redis does)
const baseQuit = mock.RedisClient.prototype.quit;
mock.RedisClient.prototype.quit = function quit(cb) {
  baseQuit.call(this);
  process.nextTick(cb);
};

const baseSubscribe = mock.RedisClient.prototype.subscribe;
mock.RedisClient.prototype.subscribe = function subscribe(channel, cb) {
  baseSubscribe.call(this, channel);
  process.nextTick(cb);
};

export default mock;
