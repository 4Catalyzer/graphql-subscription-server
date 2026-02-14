type Listener = (message: string, channel: string) => void;

const channelListeners = new Map<string, Set<Listener>>();

class MockRedisClient {
  private listeners = new Map<string, Listener>();

  duplicate() {
    return new MockRedisClient();
  }

  connect() {
    return Promise.resolve();
  }

  subscribe(channel: string, listener: Listener) {
    this.listeners.set(channel, listener);

    let listenersForChannel = channelListeners.get(channel);
    if (!listenersForChannel) {
      listenersForChannel = new Set();
      channelListeners.set(channel, listenersForChannel);
    }

    listenersForChannel.add(listener);
    return Promise.resolve();
  }

  unsubscribe(channel: string) {
    const listener = this.listeners.get(channel);
    if (!listener) return Promise.resolve();

    const listenersForChannel = channelListeners.get(channel);
    if (!listenersForChannel) return Promise.resolve();

    listenersForChannel.delete(listener);
    this.listeners.delete(channel);

    if (!listenersForChannel.size) {
      channelListeners.delete(channel);
    }

    return Promise.resolve();
  }

  publish(channel: string, message: string) {
    const listenersForChannel = channelListeners.get(channel);
    if (!listenersForChannel) return Promise.resolve(0);

    listenersForChannel.forEach((listener) => listener(message, channel));
    return Promise.resolve(listenersForChannel.size);
  }

  async quit() {
    await Promise.all(
      Array.from(this.listeners.keys()).map((channel) =>
        this.unsubscribe(channel),
      ),
    );
  }
}

function createClient() {
  return new MockRedisClient();
}

const redis = {
  createClient,
};

export { createClient };
export default redis;
