/**
 * The Apps and Visited Sites tabs read GET /timesheet/activity/daily (ever-co/ever-teams#4815). Gauzy groups its rows
 * by date, time, title and employee, so a row has no id and no description, PostgreSQL and MySQL send COUNT and SUM
 * as strings, and the MikroORM branch selects no time. The visited sites tabs ask for SITE, which Gauzy stores as URL.
 * Direct mode calls Gauzy and proxy mode calls /timer/daily, which forwards the same query.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

// The service reads the scope of the query from these two cookies.
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { activityService } from './activity.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

const todayStart = new Date('2026-10-25T00:00:00.000Z');
const todayEnd = new Date('2026-10-25T23:59:59.999Z');

// The first row as PostgreSQL sends it, the second as the MikroORM branch does, with no time.
const groupedRows = [
	{
		sessions: '3',
		duration: '1260',
		employeeId: 'employee-1',
		date: '2026-10-25',
		time: '09:00:00',
		title: 'github.com'
	},
	{
		sessions: '1',
		duration: '45',
		employeeId: 'employee-1',
		date: '2026-10-25',
		title: 'docs.ever.team'
	}
];

const apiModes = [
	['direct mode', 'https://api.example.test', '/timesheet/activity/daily'],
	['proxy mode', undefined, '/timer/daily']
] as const;

function dailyRequest(type: string) {
	return { employeeId: 'employee-1', todayStart, todayEnd, type };
}

function mockDailyRows(rows: unknown[]) {
	return jest.spyOn(activityService, 'get').mockResolvedValue({ data: rows } as never);
}

function requestedUrl(get: ReturnType<typeof mockDailyRows>): URL {
	const endpoint = get.mock.calls[0][0];
	return new URL(endpoint, 'https://client.test');
}

afterEach(() => {
	jest.restoreAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('ActivityService.getDailyActivities', () => {
	it.each(apiModes)(
		'asks for URL activities when the tab asks for SITE, in %s',
		async (_mode, apiOrigin, pathname) => {
			publishedApiOrigin.value = apiOrigin;
			const get = mockDailyRows([]);

			await activityService.getDailyActivities(dailyRequest('SITE'));

			const url = requestedUrl(get);
			expect(url.pathname).toBe(pathname);
			expect(Object.fromEntries(url.searchParams)).toEqual({
				tenantId: 'tenant-1',
				organizationId: 'organization-1',
				'employeeIds[0]': 'employee-1',
				startDate: '2026-10-25T00:00:00.000Z',
				endDate: '2026-10-25T23:59:59.999Z',
				'types[0]': 'URL'
			});
		}
	);

	it('sends the APP type as it is', async () => {
		const get = mockDailyRows([]);

		await activityService.getDailyActivities(dailyRequest('APP'));

		const url = requestedUrl(get);
		expect(url.searchParams.get('types[0]')).toBe('APP');
	});

	it.each(apiModes)('reads grouped rows with no id, description or time, in %s', async (_mode, apiOrigin) => {
		publishedApiOrigin.value = apiOrigin;
		mockDailyRows(groupedRows);

		const rows = await activityService.getDailyActivities(dailyRequest('SITE'));

		expect(rows).toEqual([
			{
				sessions: 3,
				duration: 1260,
				employeeId: 'employee-1',
				date: '2026-10-25',
				time: '09:00:00',
				title: 'github.com'
			},
			{
				sessions: 1,
				duration: 45,
				employeeId: 'employee-1',
				date: '2026-10-25',
				title: 'docs.ever.team'
			}
		]);
	});
});
