/* @flow */

export interface CredentialsManager<TCredentials> {
  authenticate(authorization: string): Promise<mixed>;
  isAuthenticated(): boolean;
  unauthenticate(): Promise<mixed>; // allow for redis etc down the line
  getCredentials(): TCredentials;
}
