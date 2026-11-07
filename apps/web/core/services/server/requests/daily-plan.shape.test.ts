/**
 * The proxy's daily-plan requests forward the shape the browser asked for (ever-co/ever-gauzy#11730) and send none
 * when it asked for none, so the API's default stays the API's.
 */
const mockServerFetch = jest.fn();

jest.mock('@/core/services/server/fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

import { getDayPlansByEmployee, getMyDailyPlansRequest } from './daily-plan';

const SCOPE = { organizationId: 'org-1', tenantId: 'tenant-1', organizationTeamId: 'team-1', bearer_token: 'token' };

/** The query string of the one request serverFetch received. */
function sentQuery(): URLSearchParams {
	const { path } = mockServerFetch.mock.calls[0][0] as { path: string };
	return new URL(`http://gauzy${path}`).searchParams;
}

beforeEach(() => {
	mockServerFetch.mockReset();
	mockServerFetch.mockResolvedValue({ data: { items: [], total: 0 } });
});

describe('getMyDailyPlansRequest', () => {
	it('forwards shape=lean next to the scope and the relations', async () => {
		await getMyDailyPlansRequest({ ...SCOPE, shape: 'lean' });
		const query = sentQuery();
		expect((mockServerFetch.mock.calls[0][0] as { path: string }).path).toMatch(/^\/daily-plan\/me\?/);
		expect(query.get('shape')).toBe('lean');
		expect(query.get('where[organizationTeamId]')).toBe('team-1');
		expect(query.get('relations[4]')).toBe('tasks.members.user');
	});

	it('sends no shape when none was asked for', async () => {
		await getMyDailyPlansRequest(SCOPE);
		expect(sentQuery().has('shape')).toBe(false);
	});
});

describe('getDayPlansByEmployee', () => {
	it('forwards shape=lean on the employee path', async () => {
		await getDayPlansByEmployee({ ...SCOPE, employeeId: 'employee-1', shape: 'lean' });
		expect((mockServerFetch.mock.calls[0][0] as { path: string }).path).toMatch(/^\/daily-plan\/employee\/employee-1\?/);
		expect(sentQuery().get('shape')).toBe('lean');
	});

	it('sends no shape when none was asked for', async () => {
		await getDayPlansByEmployee({ ...SCOPE, employeeId: 'employee-1' });
		expect(sentQuery().has('shape')).toBe(false);
	});
});
