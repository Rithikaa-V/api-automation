import { API_BASE_URL } from './env';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fail once with a useful message instead of a hundred ECONNREFUSED errors.
export default async function globalSetup() {
  const deadline = Date.now() + 30_000;
  let lastProblem = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) return;
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : String(error);
    }
    await sleep(1_000);
  }

  throw new Error(
    `API at ${API_BASE_URL} did not become healthy (${lastProblem}). ` +
      'Start it with "npm run stack:up" or "npm run dev" first.',
  );
}
