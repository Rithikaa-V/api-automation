import type { APIRequestContext, APIResponse } from '@playwright/test';

export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  login(credentials: unknown): Promise<APIResponse> {
    return this.request.post('/api/v1/auth/login', { data: credentials });
  }
}
