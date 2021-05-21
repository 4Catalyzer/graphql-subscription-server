import jwt from 'jsonwebtoken';

import JwtCredentialsManager, {
  JwtCredentials,
} from '../src/JwtCredentialsManager';

function createToken<T extends JwtCredentials>(claims: T) {
  return jwt.sign(claims, 'secretfoo');
}

describe('JwtCredentialsManager', () => {
  class TestCredentialsManager<
    T extends JwtCredentials & { count: number }
  > extends JwtCredentialsManager<T> {
    id = 0;

    getCredentialsFromAuthorization(token: string): T {
      return { ...(jwt.decode(token) as any), count: ++this.id };
    }
  }

  it('should extract credentials from token', async () => {
    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager({
      tokenExpirationMarginSeconds: 0,
    });

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining({ ...claims, count: 1 }),
    );
  });

  it('should be aware of token expiration', async () => {
    const manager = new TestCredentialsManager({
      tokenExpirationMarginSeconds: 0,
    });

    jest.useFakeTimers('modern');

    manager.authenticate(
      createToken({
        exp: Date.now() / 1000 + 30,
        sub: 'hey!',
      }),
    );

    expect(await manager.getCredentials()).toHaveProperty('count', 1);

    jest.runTimersToTime(40000);

    // check that the update logic was run again
    expect(await manager.getCredentials()).toEqual(null);
  });

  it('should unauthenticate', async () => {
    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager({
      tokenExpirationMarginSeconds: 0,
    });

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining(claims),
    );

    manager.unauthenticate();

    expect(await manager.getCredentials()).toEqual(null);

    await expect(manager.updateCredentials()).rejects.toThrow(
      'Unauthenticated',
    );
  });
});
