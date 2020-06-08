export type LogLevels =
  | 'error'
  | 'warn'
  | 'info'
  | 'verbose'
  | 'debug'
  | 'silly';

export type Logger = (
  level: LogLevels,
  message: string,
  meta?: Record<string, unknown>,
) => void;

export type CreateLogger = (group?: string) => Logger;
