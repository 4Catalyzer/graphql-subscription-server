/* @flow */

export interface CredentialsManager<TCredentials> {
  getCredentials(): ?TCredentials;
  authenticate(authorization: string): Promise<mixed>;
  unauthenticate(): Promise<mixed>; // allow for redis etc down the line
}
