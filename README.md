# GraphQL Subscription Server

A subscription server for GraphQL subscriptions. Supports streaming over plain web sockets
or Socket.IO, and integrates with Redis or any other Pub/Sub service.

## Setup

### Socket.IO

```js
import http from 'http';
import {
  SocketIOSubscriptionServer, // or WebSocketSubscriptionServer
  JwtCredentialManager,
  RedisSubscriber,
} from '@4c/graphql-subscription-server';

const server = http.createServer();

const subscriptionServer = new SocketIOSubscriptionServer({
  schema,
  path: '/socket.io/graphql',
  subscriber: new RedisSubscriber(),
  hasPermission: (message, credentials) => {
    authorize(message, credentials);
  },
  createCredentialsManager: (req) => new JwtCredentialManager(),
  createLogger: () => console.debug,
});

subscriptionServer.attach(server);

server.listen(4000, () => {
  console.log('server running');
});
```
