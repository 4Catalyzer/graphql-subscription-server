/* eslint-disable no-underscore-dangle */

import WebSocketSubscriptionServer from '../src/WebSocketSubscriptionServer';
import schema from './data/schema';
import {
  TestClient,
  TestCredentialsManager,
  delay,
  graphql,
  startServer,
} from './helpers';

function createServer(subscriber, options = {}) {
  return new WebSocketSubscriptionServer({
    ...options,
    path: '/graphql',
    schema,
    subscriber,
    hasPermission: (_, creds) => {
      return creds !== null;
    },
    createCredentialsManager: () => new TestCredentialsManager(),
    // createLogger: () => console.debug,
  });
}

type PromiseType<P> = P extends Promise<infer R> ? R : never;

describe('websocket server', () => {
  let server: PromiseType<ReturnType<typeof startServer>>;
  let client: TestClient | null = null;

  async function createClient(query: string, variables: any) {
    client = new TestClient(server.subscriber, query, variables, {
      engine: 'ws',
    });

    await client.init();
    return client;
  }

  beforeAll(async () => {
    server = await startServer(createServer);
  });

  afterEach(() => {
    client?.close();
    client = null;
  });

  afterAll(async () => {
    client?.close();
    await server.close();
  });

  it('should subscribe', async () => {
    const socket = await createClient(
      graphql`
        subscription TestTodoUpdatedSubscription(
          $input: TodoUpdatedSubscriptionInput!
        ) {
          todoUpdated(input: $input) {
            todo {
              text
            }
          }
        }
      `,
      {
        input: {
          id: '1',
        },
      },
    );

    await socket.authenticate();

    expect(
      await socket.getSubscriptionResult({
        topic: `todo:1:updated`,
        data: {
          id: '1',
          text: 'Make work',
        },
      }),
    ).toMatchInlineSnapshot(`
      Object {
        "event": "subscription update",
        "payload": Object {
          "data": Object {
            "todoUpdated": Object {
              "todo": Object {
                "text": "Buy a unicorn",
              },
            },
          },
          "id": "foo",
        },
      }
    `);
  });

  it('should unsubscribe', async () => {
    const socket = await createClient(
      graphql`
        subscription TestTodoUpdatedSubscription(
          $input: TodoUpdatedSubscriptionInput!
        ) {
          todoUpdated(input: $input) {
            todo {
              text
            }
          }
        }
      `,
      {
        input: {
          id: '1',
        },
      },
    );

    await socket.authenticate();
    await socket.subscribe();

    await socket.unsubscribe();
  });

  it('should not race unsubscribe call', async () => {
    const socket = await createClient(
      graphql`
        subscription TestTodoUpdatedSubscription(
          $input: TodoUpdatedSubscriptionInput!
        ) {
          todoUpdated(input: $input) {
            todo {
              text
            }
          }
        }
      `,
      {
        input: {
          id: '1',
        },
      },
    );

    await socket.authenticate();

    const range = Array.from({ length: 2 }, (_, i) => i);
    const promises = [] as any[];
    for (const id of range) {
      promises.push(socket.subscribe(`s-${id}`));
      promises.push(socket.unsubscribe(`s-${id}`));

      await delay(0);
    }

    await Promise.all(promises);

    expect(server.subscriber._queues.size).toEqual(0);
    expect(server.subscriber._channels.size).toEqual(0);
  });

  it('should clean up on client close', async () => {
    const socket = await createClient(
      graphql`
        subscription TestTodoUpdatedSubscription(
          $input: TodoUpdatedSubscriptionInput!
        ) {
          todoUpdated(input: $input) {
            todo {
              text
            }
          }
        }
      `,
      {
        input: {
          id: '1',
        },
      },
    );

    expect(server.subscriber._queues.size).toEqual(0);
    expect(server.subscriber._channels.size).toEqual(0);

    await socket.authenticate();
    await socket.subscribe();

    expect(server.subscriber._queues.size).toEqual(1);
    expect(server.subscriber._channels.size).toEqual(1);

    socket.close();

    await delay(50);

    expect(server.subscriber._queues.size).toEqual(0);
    expect(server.subscriber._channels.size).toEqual(0);
  });
});
