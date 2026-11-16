import jwt from 'jsonwebtoken';
import { test, expect } from '../../fixtures';
import { users } from '../../data/users';
import { expectError } from '../../support/assertions';
import { expectSchema } from '../../support/contract';

test.describe('POST /auth/login', () => {
  test('admin receives a bearer token', { tag: ['@smoke', '@contract'] }, async ({ auth }) => {
    const response = await auth.login(users.admin);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema('LoginResponse', body);
    expect(body.tokenType).toBe('Bearer');
    expect(body.user).toMatchObject({ email: users.admin.email, role: 'admin' });
  });

  test('customer receives the customer role', async ({ auth }) => {
    const response = await auth.login(users.customer);

    expect(response.status()).toBe(200);
    expect((await response.json()).user.role).toBe('customer');
  });

  test('token carries the user claims and expires in the future', async ({ auth }) => {
    const { accessToken } = await (await auth.login(users.customer)).json();
    const claims = jwt.decode(accessToken) as jwt.JwtPayload;

    expect(claims).toMatchObject({ email: users.customer.email, role: 'customer' });
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
  });

  test('email is trimmed and matched case-insensitively', async ({ auth }) => {
    const response = await auth.login({ email: `  ${users.admin.email.toUpperCase()} `, password: users.admin.password });

    expect(response.status()).toBe(200);
  });

  test('wrong password is rejected', { tag: ['@security', '@negative'] }, async ({ auth }) => {
    const response = await auth.login({ email: users.admin.email, password: 'wrong-password' });

    await expectError(response, 401, 'INVALID_CREDENTIALS');
  });

  test('unknown email and wrong password give the same response', { tag: ['@security', '@negative'] }, async ({ auth }) => {
    const wrongPassword = await auth.login({ email: users.admin.email, password: 'wrong-password' });
    const unknownUser = await auth.login({ email: 'nobody-here@example.test', password: 'wrong-password' });

    await expectError(wrongPassword, 401, 'INVALID_CREDENTIALS');
    await expectError(unknownUser, 401, 'INVALID_CREDENTIALS');
    expect(await unknownUser.json()).toEqual(await wrongPassword.json());
  });

  const invalidBodies: Array<[string, unknown]> = [
    ['a missing email', { password: 'x' }],
    ['a missing password', { email: users.admin.email }],
    ['an empty password', { email: users.admin.email, password: '' }],
    ['a malformed email', { email: 'not-an-email', password: 'x' }],
    ['a numeric password', { email: users.admin.email, password: 12345 }],
    ['a password over 128 characters', { email: users.admin.email, password: 'a'.repeat(129) }],
    ['an empty body', {}],
  ];

  for (const [description, body] of invalidBodies) {
    test(`rejects ${description}`, { tag: '@negative' }, async ({ auth }) => {
      await expectError(await auth.login(body), 400, 'VALIDATION_ERROR');
    });
  }
});
