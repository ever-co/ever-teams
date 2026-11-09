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

	it('keeps a lean plan whole through the strict schema: member ids, names, avatars, task columns', async () => {
		const employee = {
			id: '3b0b5f4a-7a5e-4d1a-9b2c-1a2b3c4d5e6f',
			userId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
			fullName: 'Ada Lovelace',
			organizationId: 'cookie-organization',
			tenantId: 'cookie-tenant',
			user: {
				id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
				name: 'Ada Lovelace',
				firstName: 'Ada',
				lastName: 'Lovelace',
				imageUrl: 'https://cdn.example.com/ada.png',
				image: { id: 'img-1', thumbUrl: 'https://cdn.example.com/ada-thumb.png', fullUrl: 'https://cdn.example.com/ada.png' }
			}
		};
		const leanPlan = {
			id: '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a',
			date: '2026-11-07',
			workTimePlanned: 8,
			status: 'open',
			employeeId: employee.id,
			organizationId: 'cookie-organization',
			tenantId: 'cookie-tenant',
			employee: { ...employee, user: { id: employee.user.id, name: 'Ada Lovelace', firstName: 'Ada', lastName: 'Lovelace', username: 'ada', imageUrl: 'https://cdn.example.com/ada.png' } },
			tasks: [
				{
					id: '1e2d3c4b-5a69-4788-9a0b-1c2d3e4f5a6b',
					title: 'Ship it',
					public: true,
					number: 12,
					prefix: 'GZ',
					taskNumber: 'GZ-12',
					status: 'in-progress',
					estimate: 3600,
					members: [employee]
				}
			]
		};
		jest
			.spyOn(dailyPlanService, 'get')
			.mockResolvedValue({ config: {}, data: { items: [leanPlan], total: 1 }, headers: {}, status: 200, statusText: 'OK' } as never);

		const page = await dailyPlanService.getMyDailyPlans();

		expect(page.total).toBe(1);
		const [plan] = page.items;
		expect(plan).toMatchObject({ id: leanPlan.id, date: '2026-11-07', workTimePlanned: 8, status: 'open', employeeId: employee.id });
		expect(plan.employee).toMatchObject({ fullName: 'Ada Lovelace', user: { id: employee.user.id, name: 'Ada Lovelace', username: 'ada' } });
		const [task] = plan.tasks ?? [];
		expect(task).toMatchObject({ id: leanPlan.tasks[0].id, title: 'Ship it', public: true, number: 12, taskNumber: 'GZ-12', estimate: 3600 });
		const [member] = task.members ?? [];
		expect(member).toMatchObject({ id: employee.id, userId: employee.userId, fullName: 'Ada Lovelace' });
		expect(member.user).toMatchObject({
			id: employee.user.id,
			firstName: 'Ada',
			lastName: 'Lovelace',
			imageUrl: 'https://cdn.example.com/ada.png',
			image: { thumbUrl: 'https://cdn.example.com/ada-thumb.png', fullUrl: 'https://cdn.example.com/ada.png' }
		});
	});

	it("asks for the lean shape on an employee's plans", async () => {
		const get = mockPlans();
		await dailyPlanService.getDayPlansByEmployee({ employeeId: 'employee-1' });
		const url = requested(get);
		expect(url.pathname).toBe('/daily-plan/employee/employee-1');
		expect(url.searchParams.get('shape')).toBe('lean');
	});
});
