/* eslint-disable max-classes-per-file */
import { EventEmitter } from 'events';
import type * as http from 'http';
import url from 'url';

import ws from 'ws';

import SubscriptionServer, {
  SubscriptionServerConfig,
} from './SubscriptionServer';
import { MessageType } from './types';

interface Message {
  type: MessageType;
  payload: any;
  ackId?: number;
}

class GraphQLSocket extends EventEmitter {
  protocol: 'graphql-transport-ws' | 'socket-io';

  private pingHandle: NodeJS.Timeout | null;

  private pongWait: NodeJS.Timeout | null;

  constructor(private socket: ws, { keepAlive = 12 * 1000 } = {}) {
    super();
    this.socket = socket;

    this.protocol =
      socket.protocol === 'graphql-transport-ws'
        ? socket.protocol
        : 'socket-io';

    socket.on('message', (data) => {
      let msg: Message | null = null;
      try {
        msg = JSON.parse(data.toString());
      } catch (err) {
        // this.log('err');
      }
      super.emit(msg!.type, msg!.payload, this.ack(msg));
    });

    socket.on('close', (code: number, reason: string) => {
      clearTimeout(this.pongWait!);
      clearInterval(this.pingHandle!);

      super.emit('close', code, reason);
    });

    // keep alive through ping-pong messages
    this.pongWait = null;

    this.pingHandle =
      keepAlive > 0 && Number.isFinite(keepAlive)
        ? setInterval(() => {
            // ping pong on open sockets only
            if (this.socket.readyState === this.socket.OPEN) {
              // terminate the connection after pong wait has passed because the client is idle
              this.pongWait = setTimeout(() => {
                this.socket.terminate();
              }, keepAlive);

              // listen for client's pong and stop socket termination
              this.socket.once('pong', () => {
                clearTimeout(this.pongWait!);
                this.pongWait = null;
              });

              this.socket.ping();
            }
          }, keepAlive)
        : null;
  }

  private ack(msg: { ackId?: number } | null) {
    if (!msg || msg.ackId == null) return undefined;
    const { ackId } = msg;
    return (data: any) => {
      this.socket.send(
        JSON.stringify({ type: `ack:${ackId}`, payload: data }),
      );
    };
  }

  emit(msg: MessageType, payload?: any) {
    this.socket.send(
      JSON.stringify({
        type: msg,
        payload,
      }),
    );
    return true;
  }

  close(code: number, reason: string) {
    this.socket.close(code, reason);
  }
}

export default class WebSocketSubscriptionServer<
  TContext,
  TCredentials,
> extends SubscriptionServer<TContext, TCredentials> {
  private ws: ws.Server;

  constructor(config: SubscriptionServerConfig<TContext, TCredentials>) {
    super(config);

    this.ws = new ws.Server({ noServer: true });

    this.ws.on('error', () => {
      // catch the first thrown error and re-throw it once all clients have been notified
      let firstErr: Error | null = null;

      // report server errors by erroring out all clients with the same error
      for (const client of this.ws.clients) {
        try {
          client.close(1011, 'Internal Error');
        } catch (err: any) {
          firstErr = firstErr ?? err;
        }
      }

      if (firstErr) throw firstErr;
    });

    this.ws.on('connection', (socket, request) => {
      const gqlSocket = new GraphQLSocket(socket);

      this.opened(gqlSocket, request as any);

      // socket io clients do this behind the scenes
      // so we keep it out of the server logic
      if (gqlSocket.protocol === 'socket-io') {
        // inform the client they are good to go
        gqlSocket.emit('connect');
      }
    });
  }

  attach(httpServer: http.Server) {
    httpServer.on(
      'upgrade',
      (req: http.IncomingMessage, socket: any, head) => {
        const { pathname } = url.parse(req.url!);
        if (pathname !== this.config.path) {
          socket.destroy();
          return;
        }

        this.ws.handleUpgrade(req, socket, head, (client) => {
          this.ws.emit('connection', client, req);
        });
      },
    );
  }

  async close() {
    for (const client of this.ws.clients) {
      client.close(1001, 'Going away');
    }
    this.ws.removeAllListeners();

    await new Promise<void>((resolve, reject) => {
      this.ws.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
