/**
 * Regression for #4791: in direct API mode the time slots query carried the day only as todayStart and
 * todayEnd, which Gauzy's GET /timesheet/statistics/time-slots does not read, so Gauzy returned the whole
 * week and the Screenshots tab and Activity for Today showed earlier days.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { statisticsService } from './statistic.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };
const TODAY_START = '2026-10-25T00:00:00.000Z';
const TODAY_END = '2026-10-25T23:59:59.999Z';

function mockTimeSlotsResponse() {
	return jest.spyOn(statisticsService, 'get').mockResolvedValue({
		config: {},
		data: [],
		headers: {},
		status: 200,
		statusText: 'OK'
	} as never);
}

async function requestTodaySlots(): Promise<URL> {
	const get = mockTimeSlotsResponse();
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
