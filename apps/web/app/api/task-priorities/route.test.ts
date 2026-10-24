const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;

describe('GET /api/task-priorities scoped fallback', () => {
	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it('forwards team and project while ignoring query tenant and organization overrides', async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (payload: unknown) => Response.json(payload),
			user: { id: 'authenticated-user' },
			access_token: 'authenticated-token',
			tenantId: 'authenticated-tenant',
			organizationId: 'authenticated-organization'
		});
		const fetchMock = jest.fn().mockResolvedValue(Response.json({ items: [], total: 0 }, { status: 200 }));
		global.fetch = fetchMock;

		const response = await GET(
			new Request(
				'https://app.ever.team/api/task-priorities?tenantId=spoofed-tenant&organizationId=spoofed-organization&organizationTeamId=selected-team&projectId=selected-project'
			)
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const upstream = new URL(String(fetchMock.mock.calls[0][0]));
		expect(upstream.pathname.endsWith('/task-priorities')).toBe(true);
		expect(Object.fromEntries(upstream.searchParams)).toEqual({
			tenantId: 'authenticated-tenant',
			organizationId: 'authenticated-organization',
			organizationTeamId: 'selected-team',
			projectId: 'selected-project'
		});
		expect(fetchMock.mock.calls[0][1]).toEqual(
			expect.objectContaining({
				headers: expect.objectContaining({ authorization: 'Bearer authenticated-token' }),
				method: 'GET'
			})
		);
	});
});
