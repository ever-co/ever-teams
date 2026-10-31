// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'cookie-team',
	getOrganizationIdCookie: () => 'cookie-organization',
	getTenantIdCookie: () => 'cookie-tenant'
}));

import moment from 'moment-timezone';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLogReportDailyRequest } from '@/core/types/interfaces/activity/activity-report';
import { statisticsService } from './statistic.service';

function axiosResponse<T>(data: T) {
	return { config: {}, data, headers: {}, status: 200, statusText: 'OK' };
}

/**
 * Regression for #4791: in direct API mode the time slots query carried the day only as todayStart and
 * todayEnd, which Gauzy's GET /timesheet/statistics/time-slots does not read, so Gauzy returned the whole
 * week and the Screenshots tab and Activity for Today showed earlier days.
 */
const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };
const TODAY_START = '2026-10-25T00:00:00.000Z';
const TODAY_END = '2026-10-25T23:59:59.999Z';

async function requestTodaySlots(): Promise<URL> {
	const get = jest.spyOn(statisticsService, 'get').mockResolvedValue(axiosResponse([]) as never);
	await statisticsService.getTimeSlotsStatistics({
		employeeId: 'employee-1',
		todayStart: new Date(TODAY_START),
		todayEnd: new Date(TODAY_END)
	});
	const [url] = get.mock.calls[0];
	return new URL(url, 'https://client.test');
}

describe('StatisticsService.getTimeSlotsStatistics day range', () => {
	beforeEach(() => {
		publishedApiOrigin.value = undefined;
	});

	afterEach(() => jest.restoreAllMocks());

	it('sends the day as startDate and endDate to the Gauzy time-slots route in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.selfhost.example';

		const requested = await requestTodaySlots();
		const query = requested.searchParams;

		expect(requested.pathname).toBe('/timesheet/statistics/time-slots');
		expect(query.get('startDate')).toBe(TODAY_START);
		expect(query.get('endDate')).toBe(TODAY_END);
	});

	it('keeps todayStart and todayEnd for the /timer/slot proxy route', async () => {
		const requested = await requestTodaySlots();
		const query = requested.searchParams;

		expect(requested.pathname).toBe('/timer/slot');
		expect(query.get('todayStart')).toBe(TODAY_START);
		expect(query.get('todayEnd')).toBe(TODAY_END);
	});
});

type CountsRange = Pick<ITimeLogReportDailyRequest, 'startDate' | 'endDate'>;

const countsRequest: ITimeLogReportDailyRequest = {
	organizationId: 'cookie-organization',
	tenantId: 'cookie-tenant',
	startDate: '2026-10-18',
	endDate: '2026-10-24',
	logType: [ETimeLogType.TRACKED],
	activityLevel: { start: 0, end: 100 }
};

async function sendCounts(range: CountsRange) {
	const response = axiosResponse({});
	const get = jest.spyOn(statisticsService, 'get').mockResolvedValue(response as never);
	const request = { ...countsRequest, ...range };

	await statisticsService.getTimesheetStatisticsCounts(request);

	const [url, config] = get.mock.calls[0];
	const parsed = new URL(url as string, 'https://client.test');
	return { parsed, config };
}

async function sentRange(range: CountsRange) {
	const { parsed } = await sendCounts(range);
	const startDate = parsed.searchParams.get('startDate');
	const endDate = parsed.searchParams.get('endDate');
	return { startDate, endDate };
}

// The app never sets a moment default zone, so a plain day is read in the browser's zone. Setting the
// default zone stands in for the user's zone, and keeps the expected instants independent of the machine.
describe('StatisticsService.getTimesheetStatisticsCounts date range', () => {
	afterEach(() => {
		moment.tz.setDefault();
		jest.restoreAllMocks();
	});

	it('sends a single picked day from its first to its last millisecond, the other parameters unchanged', async () => {
		moment.tz.setDefault('Asia/Tokyo');

		const { parsed, config } = await sendCounts({ startDate: '2026-10-24', endDate: '2026-10-24' });

		const sentParams = Object.fromEntries(parsed.searchParams);
		expect(parsed.pathname).toBe('/timesheet/statistics/counts');
		expect(sentParams).toEqual({
			'activityLevel[start]': '0',
			'activityLevel[end]': '100',
			'logType[0]': 'TRACKED',
			organizationId: 'cookie-organization',
			startDate: '2026-10-23T15:00:00.000Z',
			endDate: '2026-10-24T14:59:59.999Z',
			timeZone: 'Etc/UTC'
		});
		expect(config).toEqual({ tenantId: 'cookie-tenant' });
	});

	it('includes the whole last day of a multi-day range', async () => {
		moment.tz.setDefault('America/New_York');

		const { startDate, endDate } = await sentRange({ startDate: '2026-10-18', endDate: '2026-10-24' });

		expect(startDate).toBe('2026-10-18T04:00:00.000Z');
		expect(endDate).toBe('2026-10-25T03:59:59.999Z');
	});

	it.each([
		['go back, a 25 hour day', '2026-10-25', '2026-10-24T22:00:00.000Z', '2026-10-25T22:59:59.999Z'],
		['go forward, a 23 hour day', '2026-03-29', '2026-03-28T23:00:00.000Z', '2026-03-29T21:59:59.999Z']
	])('follows the offset of each end on a day the clocks %s', async (_change, day, expectedStart, expectedEnd) => {
		moment.tz.setDefault('Europe/Paris');

		const { startDate, endDate } = await sentRange({ startDate: day, endDate: day });

		expect(startDate).toBe(expectedStart);
		expect(endDate).toBe(expectedEnd);
	});

	it("reads a plain day in the runtime's own zone when no zone is set", async () => {
		const localDayStart = new Date(2026, 9, 24, 0, 0, 0, 0);
		const localDayEnd = new Date(2026, 9, 24, 23, 59, 59, 999);
		const expectedStart = localDayStart.toISOString();
		const expectedEnd = localDayEnd.toISOString();

		const { startDate, endDate } = await sentRange({ startDate: '2026-10-24', endDate: '2026-10-24' });

		expect(startDate).toBe(expectedStart);
		expect(endDate).toBe(expectedEnd);
	});

	it.each(['2024-12-31 12:59:59', '2026-10-24T21:59:59.999Z'])(
		'sends the full timestamp %s as it was given',
		async (timestamp) => {
			moment.tz.setDefault('Europe/Paris');

			const { startDate, endDate } = await sentRange({ startDate: timestamp, endDate: timestamp });

			expect(startDate).toBe(timestamp);
			expect(endDate).toBe(timestamp);
		}
	);

	it('sends a Date as it was given', async () => {
		moment.tz.setDefault('Europe/Paris');
		const rangeStart = new Date('2026-10-17T22:00:00.000Z');
		const rangeEnd = new Date('2026-10-24T21:59:59.999Z');

		const { startDate, endDate } = await sentRange({ startDate: rangeStart, endDate: rangeEnd });

		expect(startDate).toBe('2026-10-17T22:00:00.000Z');
		expect(endDate).toBe('2026-10-24T21:59:59.999Z');
	});
});
