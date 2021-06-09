/* eslint-disable no-underscore-dangle */
import socketio from 'socket.io-client';

import SubscriptionServer from '../src/SubscriptionServer';
import schema from './data/schema';
import {
  TestClient,
  TestCredentialsManager,
  graphql,
  startServer,
} from './helpers';

const sleep = () => new Promise((resolve) => process.nextTick(resolve));

function createServer(subscriber) {
  return new SubscriptionServer({
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

describe('socket-io client', () => {
  let server: PromiseType<ReturnType<typeof startServer>>;
  let client: TestClient | null = null;

  async function createClient(query: string, variables: any) {
    client = new TestClient(server.subscriber, query, variables);

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

  it('should connect', (done) => {
    const socket = socketio('http://localhost:5000', {
      path: '/graphql',
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.close();
      done();
    });
  }, 10000);

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

    expect(server.subscriber._queues.size).toEqual(1);

    await socket.unsubscribe();

    expect(server.subscriber._queues.size).toEqual(0);

    await Promise.all([socket.subscribe(), socket.unsubscribe()]);

    expect(server.subscriber._queues.size).toEqual(0);
  });

  it.only('should not race', async (done) => {
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

      await sleep();
    }

    await Promise.all(promises);

    setTimeout(() => {
      console.log(server.subscriber._queues);

      expect(server.subscriber._queues.size).toEqual(0);
      expect(server.subscriber._channels.size).toEqual(0);
      done();
    }, 100);
  });
});
