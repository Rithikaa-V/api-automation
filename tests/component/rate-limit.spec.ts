import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/pool';
import { users } from '../data/users';
import { expectError } from '../support/assertions';

// Runs the app inside the test process with a tiny limit. Hitting the limit on the shared
// API under test would lock out every other test that runs in parallel.
const LIMIT = 3;

let server: Server;
let loginUrl: string;

test.beforeEach(async () => {
  server = createApp({ authRateLimitMax: LIMIT }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  loginUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/auth/login`;
});

test.afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test.afterAll(async () => {
  await pool.end();
});

test.describe('login rate limiting', { tag: ['@component', '@security'] }, () => {
  test('blocks further attempts once the failed-login budget is spent', async ({ request }) => {
    for (let attempt = 0; attempt < LIMIT; attempt++) {
      const response = await request.post(loginUrl, { data: { email: users.admin.email, password: 'wrong' } });
      await expectError(response, 401, 'INVALID_CREDENTIALS');
    }

    // Even the correct password is refused while the client is throttled.
    const blocked = await request.post(loginUrl, { data: users.admin });

    await expectError(blocked, 429, 'RATE_LIMITED');
    expect(blocked.headers()['ratelimit-limit']).toBe(String(LIMIT));
    expect(blocked.headers()['retry-after']).toBeDefined();
  });

  test('successful logins do not use up the budget', async ({ request }) => {
    for (let attempt = 0; attempt < LIMIT * 2; attempt++) {
      const response = await request.post(loginUrl, { data: users.admin });
      expect(response.status()).toBe(200);
    }
  });
});
