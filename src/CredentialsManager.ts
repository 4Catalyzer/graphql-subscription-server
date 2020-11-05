export interface CredentialsManager<TCredentials> {
  getCredentials(): Promise<TCredentials | null | undefined>;
  authenticate(authorization: string): void | Promise<void>;
  unauthenticate(): void | Promise<void>; // allow for redis etc down the line
}
