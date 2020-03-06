export interface Subscriber<TSubscriberOptions extends {}> {
  subscribe(
    topic: string,
    options?: TSubscriberOptions,
  ): { iterator: Promise<AsyncIterator<any>>; close: () => Promise<void> };
  close(): void | Promise<void>;
}
