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

describe('DailyPlanService lean plan reads', () => {
	afterEach(() => jest.restoreAllMocks());

	function mockPlans() {
		return jest
			.spyOn(dailyPlanService, 'get')
			.mockResolvedValue({ config: {}, data: { items: [], total: 0 }, headers: {}, status: 200, statusText: 'OK' } as never);
	}

	function requested(get: ReturnType<typeof mockPlans>) {
		return new URL(String(get.mock.calls[0][0]), 'https://client.test');
	}

	it('asks for the lean shape with the people relations on the personal plans', async () => {
		const get = mockPlans();
		await dailyPlanService.getMyDailyPlans();
		const url = requested(get);
		expect(url.pathname).toBe('/daily-plan/me');
		expect(url.searchParams.get('shape')).toBe('lean');
		expect(['relations[0]', 'relations[1]', 'relations[2]', 'relations[3]', 'relations[4]'].map((k) => url.searchParams.get(k))).toEqual([
			'employee',
			'tasks',
			'employee.user',
			'tasks.members',
			'tasks.members.user'
		]);
	});

	it("asks for the lean shape on an employee's plans", async () => {
		const get = mockPlans();
		await dailyPlanService.getDayPlansByEmployee({ employeeId: 'employee-1' });
		const url = requested(get);
		expect(url.pathname).toBe('/daily-plan/employee/employee-1');
		expect(url.searchParams.get('shape')).toBe('lean');
	});
});
