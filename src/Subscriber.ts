export interface Subscriber<TSubscriberOptions extends {}> {
  subscribe(
    topic: string,
    options?: TSubscriberOptions,
  ): {
    iterator: Promise<AsyncIterableIterator<any>>;
    close: () => Promise<void>;
  };
  close(): void | Promise<void>;
}
