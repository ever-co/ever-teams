import moment from 'moment-timezone';
import { dailyPlanService } from './daily-plan.service';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getAccessTokenCookie: () => null,
	getActiveTeamIdCookie: () => 'cookie-team',
	getOrganizationIdCookie: () => 'cookie-organization',
	getTenantIdCookie: () => 'cookie-tenant'
}));

const removalRequest = { employeeId: 'employee-1', organizationId: 'organization-1' };

const removalResponse = {
	config: {},
	data: [],
	headers: {},
	status: 200,
	statusText: 'OK'
};

function mockRemovalResponse() {
	const put = jest.spyOn(dailyPlanService, 'put');
	put.mockResolvedValue(removalResponse as never);
	return put;
}

describe('DailyPlanService removeManyTaskFromPlans', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		jest.useRealTimers();
		moment.tz.setDefault();
	});

	// Plans are dated on the user's local day. Each case pins a zone where that day is not the UTC date.
	it.each([
		['late in the evening west of UTC', 'America/New_York', new Date('2026-06-16T03:30:00.000Z'), '2026-06-15'],
		['just after midnight east of UTC', 'Asia/Tokyo', new Date('2026-06-15T15:15:00.000Z'), '2026-06-16']
	])('sends the local day as today %s', async (_label, timeZone, now, localDay) => {
		const utcDay = moment.utc(now).format('YYYY-MM-DD');
		expect(utcDay).not.toBe(localDay);

		moment.tz.setDefault(timeZone);
		jest.useFakeTimers();
		jest.setSystemTime(now);
		const put = mockRemovalResponse();

		await dailyPlanService.removeManyTaskFromPlans({ taskId: 'task-1', data: removalRequest });

		const [url, payload, config] = put.mock.calls[0];
		const expectedPayload = { ...removalRequest, today: localDay };
		expect(url).toBe('/daily-plan/task-1/remove');
		expect(payload).toEqual(expectedPayload);
		expect(config).toEqual({ tenantId: 'cookie-tenant' });
	});
});
