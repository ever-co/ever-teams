/**
 * GET /api/board/members lists, for the Board app (#5022), the colleagues a Board can be shared with or mention:
 * the members of the signed-in person's teams, without themself, as employee id, name and picture only. It answers the
 * trusted Board origin only, and reads the teams with the session's tenant, never the cookie's.
 */
import { refused, signedIn } from '@/test/auth/guard-answers';
import { gauzyAnswers, restoreFetch } from '@/test/api/forward-to-gauzy';
import { GET } from './route';

const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

const ORIGINAL_ENV = process.env;
const BOARD_ORIGIN = 'https://board.ever.team';
const SELF = 'employee-self';

function member(employeeId: string, user: Record<string, unknown>, extra: Record<string, unknown> = {}) {
	return {
		employeeId,
		isActive: true,
		role: { name: 'MANAGER' },
		employee: { id: employeeId, isActive: true, user: { email: `${employeeId}@example.com`, ...user } },
		...extra
	};
}

const TEAMS = {
	items: [
		{
			id: 'team-1',
			members: [
				member(SELF, { name: 'Self Person' }),
				member('employee-ana', {
					firstName: 'Ana',
					lastName: 'Lima',
					imageUrl: 'https://cdn.example.com/ana.png'
				}),
				member('employee-bo', { name: 'Bo Chen' }),
				member('employee-left', { name: 'Left Team' }, { isActive: false })
			]
		},
		{
			id: 'team-2',
			members: [
				member(SELF, { name: 'Self Person' }),
				member('employee-bo', { name: 'Bo Chen' }),
				member(
					'employee-gone',
					{ name: 'Gone Employee' },
					{ employee: { id: 'employee-gone', isActive: false, user: { name: 'Gone Employee' } } }
				)
			]
		},
		{ id: 'not-my-team', members: [member('employee-other', { name: 'Other Team' })] }
	],
	total: 3
};

function membersRequest(origin: string | null): Request {
	const headers: Record<string, string> = { cookie: 'auth-token=access-token; auth-tenant-id=cookie-tenant' };
	if (origin !== null) headers.origin = origin;
	return new Request('https://app.ever.team/api/board/members', { headers });
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: `${BOARD_ORIGIN}/` };
	mockAuthenticatedGuard.mockReset();
	mockAuthenticatedGuard.mockResolvedValue(signedIn({ id: 'user-1', tenantId: 'tenant-1', employee: { id: SELF } }));
});

afterEach(restoreFetch);

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('GET /api/board/members', () => {
	it.each([
		['another origin', 'https://evil.example'],
		['no origin', null]
	])('refuses %s before any session check', async (_, origin) => {
		const fetchMock = gauzyAnswers(Response.json(TEAMS));

		const response = await GET(membersRequest(origin));

		expect(response.status).toBe(403);
		expect(response.headers.get('access-control-allow-origin')).toBeNull();
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("names the active colleagues of the person's own teams, once each, without them, and nothing more", async () => {
		gauzyAnswers(Response.json(TEAMS));

		const response = await GET(membersRequest(BOARD_ORIGIN));

		expect(response.status).toBe(200);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
		expect(response.headers.get('cache-control')).toBe('no-store');
		expect(await response.json()).toEqual({
			items: [
				{ employeeId: 'employee-ana', name: 'Ana Lima', imageUrl: 'https://cdn.example.com/ana.png' },
				{ employeeId: 'employee-bo', name: 'Bo Chen', imageUrl: null }
			]
		});
	});

	it("reads the teams with the session's tenant and token, not the cookie's tenant", async () => {
		const fetchMock = gauzyAnswers(Response.json(TEAMS));

		await GET(membersRequest(BOARD_ORIGIN));

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/organization-team?');
		expect(decodeURIComponent(url)).toContain('where[organizationId]=organization-1');
		expect(decodeURIComponent(url)).toContain('where[tenantId]=tenant-1');
		expect(init.headers).toEqual(
			expect.objectContaining({ authorization: 'Bearer access-token', 'tenant-id': 'tenant-1' })
		);
	});

	it.each([401, 503])('passes a refused session check (%i) on to the Board', async (status) => {
		mockAuthenticatedGuard.mockResolvedValue(refused(status));

		const response = await GET(membersRequest(BOARD_ORIGIN));

		expect(response.status).toBe(status);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
	});

	it("passes Gauzy's refusal on with its status", async () => {
		gauzyAnswers(Response.json({ statusCode: 429, message: 'Too Many Requests' }, { status: 429 }));

		const response = await GET(membersRequest(BOARD_ORIGIN));

		expect(response.status).toBe(429);
		expect(response.headers.get('access-control-allow-origin')).toBe(BOARD_ORIGIN);
	});
});
