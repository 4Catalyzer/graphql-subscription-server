export type SupportedProtocols =
  | 'graphql-transport-ws'
  | '4c-subscription-server';

export interface WebSocket {
  protocol: SupportedProtocols;
  id?: string;

  close(code: number, reason: string): Promise<void> | void;

  on(
    message: string,
    listener: (data: any, ack?: (data?: any) => Promise<void> | void) => void,
  ): void;

  emit(message: string, data: any): Promise<void> | void | boolean;
  // onMessage(cb: (data: string) => Promise<void>): void;
}

export type MessageType =
  | 'authenticate'
  | 'subscribe'
  | 'unsubscribe'
  | 'connect'
  | 'disconnect'
  | `ack:${number}`;

export interface BaseMessage<D = any> {
  type: MessageType;
  payload?: D;
  ackId?: number;
}
