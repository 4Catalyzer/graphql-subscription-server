/* @flow */
import type { ICredentialsManager } from './CredentialManager';

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

class JwtCredentialsManager<TCreds: JwtCredentials>
  implements ICredentialsManager<TCreds> {
  config: JwtCredentialsManagerConfig<TCreds>;
  credentials: TCreds;
  token: ?string;
  renewTimer: ?TimeoutID;

  constructor(config: JwtCredentialsManagerConfig<TCreds>) {
    this.config = config;
    this.token = null;
    this.credentials = config.initialCredentials;
  }

  getCredentials(): TCreds {
    return this.credentials;
  }

  getCredentialsFromAuthorization(
    // eslint-disable-next-line no-unused-vars
    authorization: string,
  ): TCreds | Promise<TCreds> {
    throw new Error('Not implemented');
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
      throw new Error('unauthenticated');
    }

    this.credentials = await this.getCredentialsFromAuthorization(token);

    if (config.enableTokenRenewal !== false) {
      this._scheduleRenewal();
    }
  }

  _scheduleRenewal() {
    const deltaMS = this.credentials.exp * SECONDS_TO_MS - Date.now();
    const deltaMSAdjusted = Math.max(
      0,
      deltaMS - this.config.gracePeriod * SECONDS_TO_MS,
    );

    if (this.renewTimer) clearTimeout(this.renewTimer);
    this.renewTimer = setTimeout(() => this._update(), deltaMSAdjusted);
  }
}

export default JwtCredentialsManager;
