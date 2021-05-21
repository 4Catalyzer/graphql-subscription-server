import { CredentialsManager } from './CredentialsManager';
import { JwtCredentials } from './JwtCredentialsManager';

const SECONDS_TO_MS = 1000;

export default abstract class LazyJwtCredentialsManager<
  TCredentials extends JwtCredentials
> implements CredentialsManager<TCredentials> {
  private token: string | null | undefined;

  private credentialsPromise: Promise<TCredentials | null | undefined> | null;

  constructor() {
    this.token = null;
    this.credentialsPromise = null;
  }

  private isExpired(credentials: TCredentials) {
    return Date.now() >= credentials.exp * SECONDS_TO_MS;
  }

  async getCredentials(): Promise<TCredentials | null | undefined> {
    const credentials = await this.credentialsPromise;

    if (credentials && this.isExpired(credentials)) {
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
      throw new Error('JwtCredentialManager: Unauthenticated');
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
