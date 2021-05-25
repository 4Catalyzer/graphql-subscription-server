import { CredentialsManager } from './CredentialsManager';

const SECONDS_TO_MS = 1000;

type Seconds = number;

export interface JwtCredentials {
  exp: Seconds;
}

export interface JwtCredentialsManagerConfig {
  updateOnExpired?: boolean;
}

export default abstract class JwtCredentialsManager<
  TCredentials extends JwtCredentials
> implements CredentialsManager<TCredentials> {
  private token: string | null | undefined;

  private credentialsPromise: Promise<TCredentials | null | undefined> | null;

  private updateOnExpired: boolean;

  constructor(config: JwtCredentialsManagerConfig = {}) {
    this.token = null;
    this.credentialsPromise = null;
    this.updateOnExpired = config.updateOnExpired ?? false;
  }

  private isExpired(credentials: TCredentials) {
    return Date.now() >= credentials.exp * SECONDS_TO_MS;
  }

  async getCredentials(): Promise<TCredentials | null | undefined> {
    const credentials = await this.credentialsPromise;

    if (credentials && this.isExpired(credentials)) {
      return this.updateOnExpired ? this.updateCredentials() : null;
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
        return null;
      }
      return creds;
    });

    return this.credentialsPromise;
  }
}
