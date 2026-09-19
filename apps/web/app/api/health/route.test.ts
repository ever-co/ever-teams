/**
 * GET /api/health reports the web app URL of THIS deployment, read from the live (container) env on
 * every request. Behaviour-preservation tests: Jest never inlines build-time env, so the "not frozen at
 * build time" half of the contract (NEXT_PUBLIC_WEB_APP_URL is also a next.config `env` key) is pinned by
 * test/architecture/self-hostable-docker-image.test.ts, which rejects literal-only NEXT_PUBLIC_* reads.
 */
import { GET } from './route';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.NEXT_PUBLIC_WEB_APP_URL;
	delete process.env.CLIENT_BASE_URL;
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

async function reportedUrl(): Promise<string> {
	const response = await GET();
	const body = await response.json();
	return body.response.url;
}

describe('GET /api/health', () => {
	it('reports NEXT_PUBLIC_WEB_APP_URL from the current env', async () => {
		process.env.NEXT_PUBLIC_WEB_APP_URL = 'https://teams.example.org';
		process.env.CLIENT_BASE_URL = 'https://client.example.org';

		expect(await reportedUrl()).toBe('https://teams.example.org/api/');

		process.env.NEXT_PUBLIC_WEB_APP_URL = 'https://moved.example.org';
		expect(await reportedUrl()).toBe('https://moved.example.org/api/');
	});

	it('falls back to CLIENT_BASE_URL', async () => {
		process.env.CLIENT_BASE_URL = 'https://client.example.org';

		expect(await reportedUrl()).toBe('https://client.example.org/api/');
	});

	it('keeps the status payload', async () => {
		const body = await (await GET()).json();

		expect(body.data).toEqual({ status: 200, message: 'Ever Teams Next.js API' });
	});
});
