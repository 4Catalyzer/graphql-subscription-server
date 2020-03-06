import { CredentialsManager } from './CredentialsManager';

type Seconds = number;

export type JwtCredentials = {
  exp: Seconds;
};

export type JwtCredentialsManagerConfig = {
  tokenExpirationMarginSeconds: Seconds | null;
};

const SECONDS_TO_MS = 1000;

export default class JwtCredentialsManager<TCredentials extends JwtCredentials>
  implements CredentialsManager<TCredentials> {
  config: JwtCredentialsManagerConfig;

  token: string | null | undefined;

  credentials: TCredentials | null | undefined;

  renewHandle: NodeJS.Timeout | null | undefined;

  constructor(config: JwtCredentialsManagerConfig) {
    this.config = config;

    this.token = null;
    this.credentials = null;
  }

  getCredentials(): TCredentials | null | undefined {
    const { credentials } = this;
    if (credentials && Date.now() >= credentials.exp * SECONDS_TO_MS) {
      return null;
    }

    return credentials;
  }

  getCredentialsFromAuthorization(
    _authorization: string,
  ):
    | (TCredentials | null | undefined)
    | Promise<TCredentials | null | undefined> {
    throw new Error('JwtCredentialManager: not implemented');
  }

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

    const credentials = await this.getCredentialsFromAuthorization(token);

    // Avoid race conditions with multiple updates.
    if (this.token !== token) {
      return;
    }

    this.credentials = credentials;

    // TODO: Don't schedule renewal if the new credentials are expired or
    // almost expired.
    this.scheduleRenewCredentials();
  }

  scheduleRenewCredentials() {
    if (this.renewHandle) {
      clearTimeout(this.renewHandle);
    }

    const { tokenExpirationMarginSeconds } = this.config;
    if (tokenExpirationMarginSeconds === null) {
      return;
    }

    const { credentials } = this;
    if (!credentials) {
      return;
    }

    const deltaMs = credentials.exp * SECONDS_TO_MS - Date.now();
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
