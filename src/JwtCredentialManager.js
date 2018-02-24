/* @flow */
import type { CredentialsManager } from './CredentialsManager';

type Seconds = number;

export type JwtCredentials = {
  exp: Seconds,
};

export type JwtCredentialsManagerConfig<TCredentials> = {|
  enableTokenRenewal: ?boolean, // default: true
  gracePeriod: Seconds,
  initialCredentials: TCredentials,
|};

const SECONDS_TO_MS = 1000;

class JwtCredentialsManager<TCredentials: JwtCredentials>
  implements CredentialsManager<TCredentials> {
  config: JwtCredentialsManagerConfig<TCredentials>;
  credentials: TCredentials;
  token: ?string;
  renewTimer: ?TimeoutID;

  constructor(config: JwtCredentialsManagerConfig<TCredentials>) {
    this.config = config;
    this.token = null;
    this.credentials = config.initialCredentials;
  }

  getCredentials(): TCredentials {
    return this.credentials;
  }

  getCredentialsFromAuthorization(
    // eslint-disable-next-line no-unused-vars
    authorization: string,
  ): TCredentials | Promise<TCredentials> {
    throw new Error('JwtCredentialManager: Not implemented');
  }

  async authenticate(token: string) {
    this.token = token;
    await this._update();
  }

  async unauthenticate() {
    if (this.renewTimer) clearTimeout(this.renewTimer);

    this.token = null;
    this.credentials = this.config.initialCredentials;
  }

  isAuthenticated() {
    const { exp } = this.credentials;
    return !!(Date.now() < exp * SECONDS_TO_MS);
  }

  async _update() {
    const { token, config } = this;
    if (token == null) {
      throw new Error('JwtCredentialManager: Unauthenticated');
    }

    this.credentials = await this.getCredentialsFromAuthorization(token);

    if (config.enableTokenRenewal !== false) {
      this._scheduleRenewal();
    }
  }

  _scheduleRenewal() {
    // TODO: need to handle cases where the returned token is
    // already expired or about to expire
    const deltaMs = this.credentials.exp * SECONDS_TO_MS - Date.now();
    const deltaMsAdjusted = Math.max(
      0,
      deltaMs - this.config.gracePeriod * SECONDS_TO_MS,
    );

    if (this.renewTimer) clearTimeout(this.renewTimer);
    this.renewTimer = setTimeout(() => this._update(), deltaMsAdjusted);
  }
}

export default JwtCredentialsManager;
