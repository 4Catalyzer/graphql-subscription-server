/* @flow */

export type LogLevels =
  | 'error'
  | 'warn'
  | 'info'
  | 'verbose'
  | 'debug'
  | 'silly';

export type Logger = (level: LogLevels, message: string, meta?: {}) => void;

export type LoggerFactory = (group?: string) => Logger;
