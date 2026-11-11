/**
 * @jest-environment node
 */
const mockFaviconOf = jest.fn();
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/favicons', () => ({
	faviconOf: (...args: unknown[]) => mockFaviconOf(...args)
}));
jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const SIGNED_IN = { $res: (data: unknown) => Response.json(data), user: { id: 'user-1' } };

/** The guard's answer to a token the Gauzy API refuses, whatever cookie came with it. */
const REFUSED = {
	$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
	user: null,
	status: 401
};

function request(host: string) {
	return GET(new Request(`https://app.ever.team/api/favicons/${host}`), { params: Promise.resolve({ host }) });
}

describe('GET /api/favicons/:host', () => {
	const saved = process.env.NEXT_PUBLIC_FAVICONS_ENABLED;

	beforeEach(() => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = 'true';
		mockFaviconOf.mockReset();
		mockAuthenticatedGuard.mockReset();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	});

	afterAll(() => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = saved;
	});

	it("answers a site's favicon as an image the browser may not reinterpret, kept a day", async () => {
		mockFaviconOf.mockResolvedValue({ body: PNG, type: 'image/png' });

		const response = await request('GitHub.com');

		expect(response.status).toBe(200);
		expect(mockFaviconOf).toHaveBeenCalledWith('github.com');
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
		expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
		expect(response.headers.get('cache-control')).toContain('max-age=86400');
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
	});

	it('answers 404, kept six hours, when the site has no favicon to show', async () => {
		mockFaviconOf.mockResolvedValue(null);

		const response = await request('example.org');

		expect(response.status).toBe(404);
		expect(response.headers.get('cache-control')).toContain('max-age=21600');
	});

	it('asks nothing for an address that is not a public host name', async () => {
		expect((await request('127.0.0.1')).status).toBe(400);
		expect((await request('localhost')).status).toBe(400);
		expect(mockFaviconOf).not.toHaveBeenCalled();
	});

	it('fetches nothing for a session the Gauzy API refuses: a cookie alone is not enough', async () => {
		mockAuthenticatedGuard.mockResolvedValue(REFUSED);

		const response = await request('github.com');

		expect(response.status).toBe(401);
		expect(mockFaviconOf).not.toHaveBeenCalled();
	});

	it('is off unless the deployment turns it on', async () => {
		delete process.env.NEXT_PUBLIC_FAVICONS_ENABLED;

		expect((await request('github.com')).status).toBe(404);
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
		expect(mockFaviconOf).not.toHaveBeenCalled();
	});
});
