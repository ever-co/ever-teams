/**
 * POST /api/tags/bulk is the proxy-mode twin of Gauzy's POST /tags/bulk (ever-co/ever-teams#5016): the items go to
 * Gauzy as they came, and Gauzy's per-item result comes back as it is.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { POST } from './route';

const originalFetch = global.fetch;

const items = [
	{ name: 'Bug', color: '#D73A4A', organizationTeamId: 'team-1' },
	{ name: 'Feature', color: '#8957E5', organizationTeamId: 'team-1' }
];

const gauzyResult = {
	dryRun: false,
	succeededCount: 1,
	failedCount: 1,
	total: 2,
	succeeded: [{ index: 1, id: 'tag-2', resource: 'tag' }],
	failed: [{ index: 0, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: 'A tag named "Bug" already exists here.' }]
};

let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json(gauzyResult, { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('POST /api/tags/bulk', () => {
	it("sends the items to Gauzy's /tags/bulk and answers its per-item result", async () => {
		const request = new Request('https://app.ever.team/api/tags/bulk', {
			method: 'POST',
			body: JSON.stringify({ items })
		});

		const response = await POST(request);

		expect(await response.json()).toEqual(gauzyResult);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [upstreamUrl, init] = fetchMock.mock.calls[0];
		expect(new URL(String(upstreamUrl)).pathname).toMatch(/\/tags\/bulk$/);
		expect(init.method).toBe('POST');
		expect(JSON.parse(String(init.body))).toEqual({ items });
	});

	it("answers Gauzy's refusal with its status, so the client files the labels one by one on an older API", async () => {
		const notFound = { statusCode: 404, message: 'Cannot POST /api/tags/bulk', error: 'Not Found' };
		fetchMock.mockResolvedValue(Response.json(notFound, { status: 404 }));
		const request = new Request('https://app.ever.team/api/tags/bulk', {
			method: 'POST',
			body: JSON.stringify({ items })
		});

		const response = await POST(request);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual(notFound);
	});

	it('still fails when Gauzy cannot be reached', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));
		const request = new Request('https://app.ever.team/api/tags/bulk', {
			method: 'POST',
			body: JSON.stringify({ items })
		});

		await expect(POST(request)).rejects.toThrow('fetch failed');
	});

	it('refuses a body that is not a list of 1 to 200 labels, without asking Gauzy', async () => {
		const tooMany = Array.from({ length: 201 }, (_, index) => ({ name: `Label ${index}` }));
		const bodies = [
			'{not json',
			JSON.stringify({ items: 'Bug' }),
			JSON.stringify({ items: [] }),
			JSON.stringify({ items: tooMany })
		];

		for (const body of bodies) {
			const response = await POST(new Request('https://app.ever.team/api/tags/bulk', { method: 'POST', body }));
			expect(response.status).toBe(400);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 401 to a request without a session before reading its body', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ $res: jest.fn(), user: null, status: 401 });

		const response = await POST(
			new Request('https://app.ever.team/api/tags/bulk', { method: 'POST', body: '{not json' })
		);

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses a request without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ $res: jest.fn(), user: null, status: 401 });
		const request = new Request('https://app.ever.team/api/tags/bulk', {
			method: 'POST',
			body: JSON.stringify({ items })
		});

		const response = await POST(request);

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
