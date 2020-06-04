import { CredentialsManager } from './CredentialsManager';

type Seconds = number;

export interface JwtCredentials {
  exp: Seconds;
}

export interface JwtCredentialsManagerConfig {
  tokenExpirationMarginSeconds: Seconds | null;
}

const SECONDS_TO_MS = 1000;

export default abstract class JwtCredentialsManager<
  TCredentials extends JwtCredentials
> implements CredentialsManager<TCredentials> {
  config: JwtCredentialsManagerConfig;

  token: string | null | undefined;

  credentials: Promise<TCredentials | null | undefined>;

  renewHandle: NodeJS.Timeout | null | undefined;

  constructor(config: JwtCredentialsManagerConfig) {
    this.config = config;

    this.token = null;
    this.credentials = null;
  }

  async getCredentials(): Promise<TCredentials | null | undefined> {
    if (!this.credentials) return null;

    const credentials = await this.credentials;
    if (credentials && Date.now() >= credentials.exp * SECONDS_TO_MS) {
      return null;
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
    if (this.renewHandle) {
      clearTimeout(this.renewHandle);
    }

    this.token = null;
    this.credentials = null;
  }

  async updateCredentials() {
    const { token } = this;
    if (token == null) {
      throw new Error('JwtCredentialManager: Unauthenticated');
    }

    // need to handle multiple promises
    this.credentials = Promise.resolve(
      this.getCredentialsFromAuthorization(token),
    );
    const resolvedCreds = await this.credentials;

    // Avoid race conditions with multiple updates.
    if (this.token !== token) {
      return;
    }

    // TODO: Don't schedule renewal if the new credentials are expired or
    // almost expired.
    this.scheduleRenewCredentials(resolvedCreds);
  }

  scheduleRenewCredentials(resolvedCreds: TCredentials | null | undefined) {
    if (this.renewHandle) {
      clearTimeout(this.renewHandle);
    }

    const { tokenExpirationMarginSeconds } = this.config;
    if (tokenExpirationMarginSeconds === null) {
      return;
    }

    if (!resolvedCreds) {
      return;
    }

    const deltaMs = resolvedCreds.exp * SECONDS_TO_MS - Date.now();
    const deltaMsAdjusted = Math.max(
      0,
      deltaMs - tokenExpirationMarginSeconds * SECONDS_TO_MS,
    );

    this.renewHandle = setTimeout(
      () => this.updateCredentials(),
      deltaMsAdjusted,
    );
  }
}
