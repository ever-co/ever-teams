/**
 * GET /api/timer/daily is the proxy-mode twin of Gauzy's /timesheet/activity/daily. It used to drop the parameters
 * `getDailyActivities` sends (ever-co/ever-teams#4661): the dates, the selected member, the activity type and the
 * title must reach Gauzy as sent, and a request naming no member reads the signed-in employee.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1', employee: { id: 'signed-in-employee' } },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json([], { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** The query Gauzy was asked with. */
const upstreamQuery = () => Object.fromEntries(new URL(String(fetchMock.mock.calls[0][0])).searchParams);

describe('GET /api/timer/daily', () => {
	it('forwards the dates, the selected member, the type and the title', async () => {
		const query = new URLSearchParams({
			startDate: '2026-10-20T00:00:00.000Z',
			endDate: '2026-10-26T23:59:59.999Z',
			'employeeIds[0]': 'selected-employee',
			'types[0]': 'URL',
			'title[0]': 'github.com'
		});

		const response = await GET(new Request(`https://app.ever.team/api/timer/daily?${query}`));

		expect(response.status).toBe(200);
		expect(new URL(String(fetchMock.mock.calls[0][0])).pathname.endsWith('/timesheet/activity/daily')).toBe(true);
		expect(upstreamQuery()).toEqual({
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			'employeeIds[0]': 'selected-employee',
			startDate: '2026-10-20T00:00:00.000Z',
			endDate: '2026-10-26T23:59:59.999Z',
			'types[0]': 'URL',
			'title[0]': 'github.com',
			'activityLevel[start]': '0',
			'activityLevel[end]': '100'
		});
	});

	it('reads the signed-in employee when no member is named', async () => {
		await GET(new Request('https://app.ever.team/api/timer/daily?type=APP'));

		expect(upstreamQuery()).toMatchObject({ 'employeeIds[0]': 'signed-in-employee', 'types[0]': 'APP' });
	});

	it('answers 400 for a date that does not parse, and asks Gauzy nothing', async () => {
		const response = await GET(new Request('https://app.ever.team/api/timer/daily?startDate=not-a-date'));

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
