/**
 * PUT /api/invite/:id is the proxy-mode twin of Gauzy's PUT /invite/:id/:action. It read `action` as a property of
 * the URLSearchParams object, which is always undefined, so accepting or rejecting an invitation answered 400 and
 * never reached Gauzy (ever-co/ever-teams#4799). The action becomes a path segment of the Gauzy request, so only
 * ACCEPTED and REJECTED are forwarded.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { PUT } from './route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1'
	});
	const gauzyAnswer = Response.json({ id: 'invitation-1' }, { status: 200 });
	fetchMock = jest.fn();
	fetchMock.mockResolvedValue(gauzyAnswer);
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** PUT /api/invite/invitation-1 with the query the browser sends in proxy mode. */
function putInvite(query: string) {
	const url = `https://app.ever.team/api/invite/invitation-1${query}`;
	const request = new Request(url, { method: 'PUT' });
	const params = Promise.resolve({ id: 'invitation-1' });
	return PUT(request, { params });
}

/** The request the route sent to Gauzy: its path, as the URL parser resolves it, and its options. */
function gauzyRequest() {
	const [requestedUrl, init] = fetchMock.mock.calls[0];
	const url = new URL(requestedUrl, 'http://gauzy.invalid');
	return { path: url.pathname, init };
}

describe('PUT /api/invite/:id', () => {
	it.each(['ACCEPTED', 'REJECTED'])('forwards ?action=%s to Gauzy as the last path segment', async (action) => {
		const query = `?action=${action}`;
		const gauzyPath = new RegExp(`/invite/invitation-1/${action}$`);

		const response = await putInvite(query);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'invitation-1' });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const { path, init } = gauzyRequest();
		expect(path).toMatch(gauzyPath);
		expect(init).toEqual(
			expect.objectContaining({
				method: 'PUT',
				headers: expect.objectContaining({ authorization: 'Bearer access-token', 'tenant-id': 'tenant-1' })
			})
		);
	});

	it('keeps the invitation id in one path segment', async () => {
		const url = 'https://app.ever.team/api/invite/..%2Fuser?action=ACCEPTED';
		const request = new Request(url, { method: 'PUT' });
		const params = Promise.resolve({ id: '../user' });

		await PUT(request, { params });

		const { path } = gauzyRequest();
		expect(path).toMatch(/\/invite\/\.\.%2Fuser\/ACCEPTED$/);
	});

	it.each([
		['an action Gauzy does not take', '?action=EXPIRED'],
		['a path in the action', '?action=..%2F..%2Fuser%2Fme'],
		['no action', '']
	])('answers 400 for %s, and asks Gauzy nothing', async (_label, query) => {
		const response = await putInvite(query);

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
