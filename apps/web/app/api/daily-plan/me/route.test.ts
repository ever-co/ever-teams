/**
 * GET /api/daily-plan/me (proxy mode) reads my plans with the session's scope and forwards the shape the browser asked
 * for (ever-co/ever-gauzy#11730); an unknown or absent shape is not forwarded.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetMyDailyPlans = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	...jest.requireActual('@/core/services/server/requests/response-shape'),
	getMyDailyPlansRequest: (...args: unknown[]) => mockGetMyDailyPlans(...args)
}));

import { GET } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-1'
};

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetMyDailyPlans.mockReset();
	mockGetMyDailyPlans.mockResolvedValue({ data: { items: [], total: 0 } });
});

it('forwards shape=lean with the session scope', async () => {
	const response = await GET(new Request('http://localhost/api/daily-plan/me?shape=lean&where%5BorganizationId%5D=spoofed'));
	expect(response.status).toBe(200);
	expect(mockGetMyDailyPlans).toHaveBeenCalledWith({
		bearer_token: 'access-token',
		organizationId: 'organization-1',
		tenantId: 'tenant-1',
		organizationTeamId: 'team-1',
		shape: 'lean'
	});
});

it.each(['', '?shape=compact'])('forwards no shape for "%s"', async (query) => {
	await GET(new Request(`http://localhost/api/daily-plan/me${query}`));
	expect(mockGetMyDailyPlans).toHaveBeenCalledWith(expect.objectContaining({ shape: undefined }));
});

it('lets the session check answer a signed-out caller', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: () => Response.json({ message: 'Unauthorized' }, { status: 401 }),
		user: null
	});
	const response = await GET(new Request('http://localhost/api/daily-plan/me?shape=lean'));
	expect(response.status).toBe(401);
	expect(mockGetMyDailyPlans).not.toHaveBeenCalled();
});
