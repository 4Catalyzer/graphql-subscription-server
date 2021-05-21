import jwt from 'jsonwebtoken';

import { JwtCredentials } from '../src/JwtCredentialsManager';
import LazyJwtCredentialsManager from '../src/LazyJwtCredentialsManager';

function createToken<T extends JwtCredentials>(claims: T) {
  return jwt.sign(claims, 'secretfoo');
}

describe('LazyJwtCredentialsManager', () => {
  it('should extract credentials from token', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials
    > extends LazyJwtCredentialsManager<T> {
      getCredentialsFromAuthorization(token: string) {
        return jwt.decode(token) as T;
      }
    }

    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager();

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining({ sub: 'hey!' }),
    );
  });

  it('should return null when refetched creds are already expired', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials
    > extends LazyJwtCredentialsManager<T> {
      getCredentialsFromAuthorization(token: string) {
        return jwt.decode(token) as T;
      }
    }

    jest.useFakeTimers('modern');

    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager();

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining({ sub: 'hey!' }),
    );

    jest.runTimersToTime(50000);

    expect(await manager.getCredentials()).toEqual(null);
  });

  it('should re-up when credentials expire', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials & { count: number }
    > extends LazyJwtCredentialsManager<T> {
      id = 0;

      getCredentialsFromAuthorization(token: string): T {
        const creds = jwt.decode(token) as any;

        return { ...creds, count: ++this.id, exp: Date.now() / 1000 + 30 };
      }
    }

    const manager = new TestCredentialsManager();

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
    expect(await manager.getCredentials()).toHaveProperty('count', 2);
  });

  it('should unauthenticate', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials
    > extends LazyJwtCredentialsManager<T> {
      getCredentialsFromAuthorization(token: string) {
        return jwt.decode(token) as T;
      }
    }

    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager();

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining(claims),
    );

    manager.unauthenticate();

    expect(await manager.getCredentials()).toEqual(null);
  });
});
