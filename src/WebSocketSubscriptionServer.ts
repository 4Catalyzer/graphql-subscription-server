/* eslint-disable max-classes-per-file */
import { EventEmitter } from 'events';
import type * as http from 'http';
import url from 'url';

import ws from 'ws';

import SubscriptionServer, {
  SubscriptionServerConfig,
} from './SubscriptionServer';
import { MessageType, SupportedProtocols } from './types';

export type DisconnectReason =
  | 'server disconnect'
  | 'client disconnect'
  | 'ping timeout';
interface Message {
  type: MessageType;
  payload: any;
  ackId?: number;
}

class GraphQLSocket extends EventEmitter {
  protocol: SupportedProtocols;

  isAlive = true;

  constructor(private socket: ws) {
    super();

    this.socket = socket;
    this.isAlive = true;

    this.protocol =
      socket.protocol === 'graphql-transport-ws'
        ? socket.protocol
        : '4c-subscription-server';

    socket.on('pong', () => {
      this.isAlive = true;
    });

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
      this.isAlive = false;
      super.emit('disconnect', 'client disconnect');
      super.emit('close', code, reason);
    });
  }

  disconnect(reason?: DisconnectReason) {
    this.emit('disconnect', reason);
    super.emit('disconnect', reason);
    this.socket.terminate();
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

  ping() {
    if (this.socket.readyState === this.socket.OPEN) {
      this.isAlive = false;
      this.socket.ping();
    }
  }
}

export interface WebSocketSubscriptionServerConfig<TContext, TCredentials>
  extends SubscriptionServerConfig<TContext, TCredentials> {
  keepAlive?: number;
}
export default class WebSocketSubscriptionServer<
  TContext,
  TCredentials,
> extends SubscriptionServer<TContext, TCredentials> {
  private ws: ws.Server;

  private gqlClients = new WeakMap<ws, GraphQLSocket>();

  readonly keepAlive: number;

  private pingHandle: NodeJS.Timeout | null = null;

  constructor({
    keepAlive = 15_000,
    ...config
  }: WebSocketSubscriptionServerConfig<TContext, TCredentials>) {
    super(config);

    this.ws = new ws.Server({ noServer: true });
    this.keepAlive = keepAlive;

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

    this.scheduleLivelinessCheck();
    this.ws.on('connection', (socket, request) => {
      const gqlSocket = new GraphQLSocket(socket);
      this.gqlClients.set(socket, gqlSocket);

      this.initConnection(gqlSocket, request as any);

      // socket io clients do this behind the scenes
      // so we keep it out of the server logic
      if (gqlSocket.protocol === '4c-subscription-server') {
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
    clearTimeout(this.pingHandle!);

    for (const client of this.ws.clients) {
      client.close(1001, 'Going away');
    }
    this.ws.removeAllListeners();

    await new Promise<void>((resolve, reject) => {
      this.ws.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private scheduleLivelinessCheck() {
    clearTimeout(this.pingHandle!);
    this.pingHandle = setTimeout(() => {
      for (const socket of this.ws.clients) {
        const gql = this.gqlClients.get(socket);
        if (!gql) {
          continue;
        }
        if (!gql.isAlive) {
          gql.disconnect('ping timeout');
          return;
        }

        gql.ping();
      }

      this.scheduleLivelinessCheck();
    }, this.keepAlive);
  }
}
