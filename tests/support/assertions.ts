import { expect, type APIResponse } from '@playwright/test';
import { expectSchema } from './contract';
import type { ApiError } from '../types';

/** Status, JSON content type, error envelope shape and error code in one place. */
export async function expectError(response: APIResponse, status: number, code: string) {
  expect(response.status(), await response.text()).toBe(status);
  expect(response.headers()['content-type']).toContain('application/json');

  const body = (await response.json()) as ApiError;
  expectSchema('ErrorResponse', body);
  expect(body.error.code).toBe(code);
}
