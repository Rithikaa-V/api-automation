import type { APIRequestContext, APIResponse } from '@playwright/test';

const BASE = '/api/v1/products';

type Query = Record<string, string | number>;

/** Thin wrapper over the products endpoints. Payloads are `unknown` on purpose so tests can send invalid ones. */
export class ProductsClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token?: string,
  ) {}

  private get headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
  }

  list(params: Query = {}): Promise<APIResponse> {
    return this.request.get(BASE, { params, headers: this.headers });
  }

  get(id: number | string): Promise<APIResponse> {
    return this.request.get(`${BASE}/${id}`, { headers: this.headers });
  }

  create(data: unknown): Promise<APIResponse> {
    return this.request.post(BASE, { data, headers: this.headers });
  }

  replace(id: number | string, data: unknown): Promise<APIResponse> {
    return this.request.put(`${BASE}/${id}`, { data, headers: this.headers });
  }

  update(id: number | string, data: unknown): Promise<APIResponse> {
    return this.request.patch(`${BASE}/${id}`, { data, headers: this.headers });
  }

  remove(id: number | string): Promise<APIResponse> {
    return this.request.delete(`${BASE}/${id}`, { headers: this.headers });
  }
}
