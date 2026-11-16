import http from 'k6/http';
import { check, sleep } from 'k6';

// Pass a different target with: k6 run -e API_BASE_URL=http://host:3000 performance/products.js
const BASE_URL = __ENV.API_BASE_URL || 'http://127.0.0.1:3000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:list}': ['p(95)<500'],
    'http_req_duration{name:get-by-id}': ['p(95)<500'],
  },
};

export default function () {
  const list = http.get(`${BASE_URL}/api/v1/products?limit=20&offset=0`, { tags: { name: 'list' } });
  check(list, {
    'list returns 200': (r) => r.status === 200,
    'list has a data array': (r) => Array.isArray(r.json('data')),
  });

  const id = list.json('data.0.id');
  if (id) {
    const one = http.get(`${BASE_URL}/api/v1/products/${id}`, { tags: { name: 'get-by-id' } });
    check(one, { 'get-by-id returns 200': (r) => r.status === 200 });
  }

  sleep(1);
}
