/* eslint-disable no-underscore-dangle */
import socketio from 'socket.io-client';

import {
  TestClient,
  TestCredentialsManager,
  delay,
  graphql,
  startServer,
} from './helpers.js';
import SubscriptionServer from '../src/SubscriptionServer.js';
import { maskNonDeterministicValues } from '../src/Testing.js';
import { CreateLogger } from '../src/index.js';
import schema from './data/schema.js';

const sleep = () => new Promise((resolve) => process.nextTick(resolve));

function createServer(subscriber, options = {}) {
  return new SubscriptionServer({
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
     {
       "event": "subscription update",
       "payload": {
         "data": {
           "todoUpdated": {
             "todo": {
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

      await sleep();
    }

    await Promise.all(promises);

    expect(server.subscriber._queues.size).toEqual(0);
    expect(server.subscriber._channels.size).toEqual(0);
  });

  it('should clean up subscriptions after execution errors', async () => {
    const socket = await createClient(
      graphql`
        subscription TestErrorSubscription(
          $input: ExecutionErrorSubscriptionInput!
        ) {
          todoFailingExample(input: $input) {
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

    const result = await socket.getSubscriptionResult({
      topic: `todo:1:updated`,
      data: { id: '1' },
    });

    expect(result).toEqual({
      event: 'app_error',
      payload: expect.objectContaining({ code: 'subscribe_failed.gql_error' }),
    });
    expect(server.subscriber._queues.size).toEqual(0);
    expect(server.subscriber._channels.size).toEqual(0);
  });
});

describe('socket-io client logging', () => {
  let server: PromiseType<ReturnType<typeof startServer>>;
  let client: TestClient | null = null;
  let logs: any[];

  async function createClient(query: string, variables: any) {
    client = new TestClient(server.subscriber, query, variables);

    await client.init();
    return client;
  }

  beforeAll(async () => {
    logs = [] as any[];
    const createLogger: CreateLogger = (group) => (level, message, meta) =>
      logs.push({
        group,
        level,
        message,
        meta: maskNonDeterministicValues(meta, ['clientId']),
      });

    server = await startServer((sub) => createServer(sub, { createLogger }));
  });

  afterEach(() => {
    client?.close();
    client = null;
  });

  afterAll(async () => {
    client?.close();
    await server.close();
  });

  it('should log', async () => {
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

    await socket.getSubscriptionResult({
      topic: `todo:1:updated`,
      data: { id: '1' },
    });

    await socket.subscribe();

    await socket.unsubscribe();

    socket.close();

    await delay(50);

    expect(logs).toMatchInlineSnapshot(`
     [
       {
         "group": "SubscriptionServer",
         "level": "debug",
         "message": "new socket connection",
         "meta": {
           "clientId": "<ClientId:1>",
           "numClients": 1,
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "debug",
         "message": "authenticating connection",
         "meta": {
           "clientId": "<ClientId:1>",
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "debug",
         "message": "client subscribed",
         "meta": {
           "clientId": "<ClientId:1>",
           "id": "foo",
           "query": "
             subscription TestTodoUpdatedSubscription(
               $input: TodoUpdatedSubscriptionInput!
             ) {
               todoUpdated(input: $input) {
                 todo {
                   text
                 }
               }
             }
           ",
           "variables": {
             "input": {
               "id": "1",
             },
           },
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "info",
         "message": "emit",
         "meta": {
           "clientId": "<ClientId:1>",
           "credentials": {},
           "response": {
             "data": {
               "todoUpdated": {
                 "todo": {
                   "text": "Buy a unicorn",
                 },
               },
             },
           },
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "debug",
         "message": "duplicate subscription attempted",
         "meta": {
           "clientId": "<ClientId:1>",
           "id": "foo",
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "debug",
         "message": "client unsubscribed",
         "meta": {
           "clientId": "<ClientId:1>",
           "id": "foo",
         },
       },
       {
         "group": "AuthorizedSocket",
         "level": "debug",
         "message": "client disconnected",
         "meta": {
           "clientId": "<ClientId:1>",
           "reason": "client namespace disconnect",
         },
       },
       {
         "group": "SubscriptionServer",
         "level": "debug",
         "message": "socket disconnected",
         "meta": {
           "clientId": "<ClientId:1>",
           "numClients": 0,
           "reason": "client namespace disconnect",
         },
       },
     ]
    `);
  });
});
