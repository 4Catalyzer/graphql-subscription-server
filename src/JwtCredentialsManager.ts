import { CredentialsManager } from './CredentialsManager';
import { CreateLogger, Logger, noopCreateLogger } from './Logger';

const SECONDS_TO_MS = 1000;

type Seconds = number;

export interface JwtCredentials {
  exp: Seconds;
}

export interface JwtCredentialsManagerConfig {
  updateOnExpired?: boolean;
  createLogger?: CreateLogger;
}

export default abstract class JwtCredentialsManager<
  TCredentials extends JwtCredentials,
> implements CredentialsManager<TCredentials>
{
  private token: string | null | undefined;

  private credentialsPromise: Promise<TCredentials | null | undefined> | null;

  private updateOnExpired: boolean;

  readonly log: Logger;

  constructor({
    createLogger = noopCreateLogger,
    updateOnExpired,
  }: JwtCredentialsManagerConfig = {}) {
    this.token = null;
    this.credentialsPromise = null;
    this.updateOnExpired = updateOnExpired ?? false;
    this.log = createLogger('JwtCredentialsManager');
  }

  private isExpired(credentials: TCredentials) {
    return Date.now() >= credentials.exp * SECONDS_TO_MS;
  }

  async getCredentials(): Promise<TCredentials | null | undefined> {
    const credentials = await this.credentialsPromise;

    if (credentials && this.isExpired(credentials)) {
      if (!this.updateOnExpired) {
        this.log('debug', 'request for expired credentials', {
          token: this.token,
          expiredCredentials: credentials,
        });
        return null;
      }
      this.log('silly', 'credentials expired: refreshing from token', {
        token: this.token,
        expiredCredentials: credentials,
      });
      return this.updateCredentials();
    }

    return credentials;
  }

  abstract getCredentialsFromAuthorization(
    authorization: string,
  ):
    | (TCredentials | null | undefined)
    | Promise<TCredentials | null | undefined>;

  async authenticate(token: string) {
    this.token = token;
    await this.updateCredentials();
  }

  unauthenticate() {
    this.token = null;
    this.credentialsPromise = null;
  }

  private updateCredentials() {
    const { token } = this;
    if (token == null) {
      throw new Error('JwtCredentialsManager: Unauthenticated');
    }

    this.credentialsPromise = Promise.resolve(
      this.getCredentialsFromAuthorization(token),
    ).then((creds) => {
      if (!creds || this.isExpired(creds)) {
        this.log('silly', 'credentials expired after update', {
          token: this.token,
          credentials: creds,
        });
        return null;
      }
      return creds;
    });

    return this.credentialsPromise;
  }
}
