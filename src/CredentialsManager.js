/* @flow */

export interface CredentialsManager<TCredentials> {
  getCredentials(): ?TCredentials;
  authenticate(authorization: string): void | Promise<void>;
  unauthenticate(): void | Promise<void>; // allow for redis etc down the line
}
