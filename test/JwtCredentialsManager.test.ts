import jwt from 'jsonwebtoken';

import LazyJwtCredentialsManager, {
  JwtCredentials,
} from '../src/JwtCredentialsManager.js';
import { CreateLogger } from '../src/Logger.js';

function createToken<T extends JwtCredentials>(claims: T) {
  return jwt.sign(claims, 'secretfoo');
}

describe('JwtCredentialsManager', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should extract credentials from token', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials,
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

  it('should return null when creds are expired', async () => {
    let count = 0;
    class TestCredentialsManager<
      T extends JwtCredentials,
    > extends LazyJwtCredentialsManager<T> {
      getCredentialsFromAuthorization(token: string) {
        count++;
        return jwt.decode(token) as T;
      }
    }

    jest.useFakeTimers();

    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager();

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining({ sub: 'hey!' }),
    );

    jest.advanceTimersByTime(50000);

    expect(await manager.getCredentials()).toEqual(null);

    expect(count).toEqual(1);
  });

  it('should return null when refetched creds are already expired', async () => {
    let count = 0;
    class TestCredentialsManager<
      T extends JwtCredentials,
    > extends LazyJwtCredentialsManager<T> {
      constructor() {
        super({ updateOnExpired: true });
      }

      getCredentialsFromAuthorization(token: string) {
        count++;
        return jwt.decode(token) as T;
      }
    }

    jest.useFakeTimers();

    const claims = {
      exp: Date.now() / 1000 + 30,
      sub: 'hey!',
    };

    const manager = new TestCredentialsManager();

    manager.authenticate(createToken(claims));

    expect(await manager.getCredentials()).toEqual(
      expect.objectContaining({ sub: 'hey!' }),
    );

    jest.advanceTimersByTime(50000);

    expect(await manager.getCredentials()).toEqual(null);

    expect(count).toEqual(2);
  });

  it('should re-up when credentials expire', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials & { count: number },
    > extends LazyJwtCredentialsManager<T> {
      id = 0;

      constructor() {
        super({ updateOnExpired: true });
      }

      getCredentialsFromAuthorization(token: string): T {
        const creds = jwt.decode(token) as any;

        return { ...creds, count: ++this.id, exp: Date.now() / 1000 + 30 };
      }
    }

    const manager = new TestCredentialsManager();

    jest.useFakeTimers();

    manager.authenticate(
      createToken({
        exp: Date.now() / 1000 + 30,
        sub: 'hey!',
      }),
    );

    expect(await manager.getCredentials()).toHaveProperty('count', 1);

    jest.advanceTimersByTime(40000);

    // check that the update logic was run again
    expect(await manager.getCredentials()).toHaveProperty('count', 2);
  });

  it('should unauthenticate', async () => {
    class TestCredentialsManager<
      T extends JwtCredentials,
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

  it('should use provided logger', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1623242506 * 1000);
    const TOKEN =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjMyNDI1MzYuNjM3LCJzdWIiOiJoZXkhIiwiaWF0IjoxNjIzMjQyNTA2fQ.AttvLUmHSC9vIeESZYPZ8zLhdbOeSUs-Giwei2uKGJs';

    const logs = [] as any[];

    const createLogger: CreateLogger = (group) => (level, message, meta) =>
      logs.push({ group, level, message, meta });

    class TestCredentialsManager<
      T extends JwtCredentials,
    > extends LazyJwtCredentialsManager<T> {
      getCredentialsFromAuthorization(token: string) {
        return jwt.decode(token) as T;
      }
    }

    let manager = new TestCredentialsManager({ createLogger });

    manager.authenticate(TOKEN);

    await manager.getCredentials();

    jest.advanceTimersByTime(50000);

    await manager.getCredentials();

    manager.unauthenticate();

    manager = new TestCredentialsManager({
      createLogger,
      updateOnExpired: true,
    });
    jest.setSystemTime(1623242506 * 1000);

    manager.authenticate(TOKEN);

    await manager.getCredentials();

    jest.advanceTimersByTime(50000);

    await manager.getCredentials();

    manager.unauthenticate();

    expect(logs).toMatchInlineSnapshot(`
     [
       {
         "group": "JwtCredentialsManager",
         "level": "debug",
         "message": "request for expired credentials",
         "meta": {
           "expiredCredentials": {
             "exp": 1623242536.637,
             "iat": 1623242506,
             "sub": "hey!",
           },
           "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjMyNDI1MzYuNjM3LCJzdWIiOiJoZXkhIiwiaWF0IjoxNjIzMjQyNTA2fQ.AttvLUmHSC9vIeESZYPZ8zLhdbOeSUs-Giwei2uKGJs",
         },
       },
       {
         "group": "JwtCredentialsManager",
         "level": "silly",
         "message": "credentials expired: refreshing from token",
         "meta": {
           "expiredCredentials": {
             "exp": 1623242536.637,
             "iat": 1623242506,
             "sub": "hey!",
           },
           "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjMyNDI1MzYuNjM3LCJzdWIiOiJoZXkhIiwiaWF0IjoxNjIzMjQyNTA2fQ.AttvLUmHSC9vIeESZYPZ8zLhdbOeSUs-Giwei2uKGJs",
         },
       },
       {
         "group": "JwtCredentialsManager",
         "level": "silly",
         "message": "credentials expired after update",
         "meta": {
           "credentials": {
             "exp": 1623242536.637,
             "iat": 1623242506,
             "sub": "hey!",
           },
           "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MjMyNDI1MzYuNjM3LCJzdWIiOiJoZXkhIiwiaWF0IjoxNjIzMjQyNTA2fQ.AttvLUmHSC9vIeESZYPZ8zLhdbOeSUs-Giwei2uKGJs",
         },
       },
     ]
    `);
  });
});
