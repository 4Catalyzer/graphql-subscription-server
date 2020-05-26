export interface Subscriber<TSubscriberOptions> {
  subscribe(
    topic: string,
    options?: TSubscriberOptions,
  ): {
    iterator: Promise<AsyncIterableIterator<any>>;
    close: () => Promise<void>;
  };
  close(): void | Promise<void>;
}
