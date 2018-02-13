/* @flow */

import mock from 'redis-mock';

// redis mock doesn't fire the callback (but redis does)
const baseQuit = mock.RedisClient.prototype.quit;
mock.RedisClient.prototype.quit = function quit(cb) {
  baseQuit.call(this);
  process.nextTick(cb);
};

export default mock;
