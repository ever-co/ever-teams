/**
 * The Weekly limit report asks Gauzy for the user's day bounds: Gauzy filters on these instants and lists their days
 * in `timeZone`. Jest gives each file a copy of process.env, so the zone is set on the real process to make the UTC
 * day differ from the local one, and restored once the file is done.
 */
import { runInThisContext } from 'node:vm';
import { timeLogService } from './time-log.service';

const NEW_YORK = 'America/New_York';
const realProcess = runInThisContext('process') as NodeJS.Process;
const runnerTimeZone = realProcess.env.TZ;

function restoreRunnerTimeZone() {
	if (runnerTimeZone === undefined) {
		delete realProcess.env.TZ;
		return;
	}
	realProcess.env.TZ = runnerTimeZone;
}

async function requestTimeLimits(startDate: Date, endDate: Date) {
	const get = jest.spyOn(timeLogService, 'get');
	get.mockResolvedValue({ data: [] } as never);

	await timeLogService.getTimeLimitsReport({ startDate, endDate, timeZone: NEW_YORK });

	const [url] = get.mock.calls[0];
	const parsed = new URL(url, 'https://client.test');

	return parsed.searchParams;
}

describe('TimeLogService weekly limit report day bounds', () => {
	beforeAll(() => {
		realProcess.env.TZ = NEW_YORK;
	});

	afterAll(restoreRunnerTimeZone);

	afterEach(() => jest.restoreAllMocks());

	it('covers the whole New York day when Today is picked after 20:00', async () => {
		// 20:30 on October 23 in New York is already October 24 in UTC
		const now = new Date('2026-10-24T00:30:00.000Z');

		const query = await requestTimeLimits(now, now);

		expect(query.get('startDate')).toBe('2026-10-23T04:00:00.000Z');
		expect(query.get('endDate')).toBe('2026-10-24T03:59:59.999Z');
		expect(query.get('timeZone')).toBe(NEW_YORK);
	});

	it('runs from midnight of the first picked day to the end of the last one', async () => {
		// The calendar hands over the local midnight of each picked day
		const firstDay = new Date('2026-10-19T04:00:00.000Z');
		const lastDay = new Date('2026-10-25T04:00:00.000Z');

		const query = await requestTimeLimits(firstDay, lastDay);

		expect(query.get('startDate')).toBe('2026-10-19T04:00:00.000Z');
		expect(query.get('endDate')).toBe('2026-10-26T03:59:59.999Z');
	});

	it("takes the bounds in the zone it sends, not the browser's, when the user's zone differs", async () => {
		realProcess.env.TZ = 'Asia/Tokyo';
		try {
			// The calendar hands over the Tokyo midnight of October 19 and of October 25
			const firstDay = new Date('2026-10-18T15:00:00.000Z');
			const lastDay = new Date('2026-10-24T15:00:00.000Z');

			const query = await requestTimeLimits(firstDay, lastDay);

			// October 19 to 25 in New York, the zone Gauzy lists the days in
			expect(query.get('startDate')).toBe('2026-10-19T04:00:00.000Z');
			expect(query.get('endDate')).toBe('2026-10-26T03:59:59.999Z');
			expect(query.get('timeZone')).toBe(NEW_YORK);
		} finally {
			realProcess.env.TZ = NEW_YORK;
		}
	});
});

describe('TimeLogService daily report time without a team', () => {
	afterEach(() => jest.restoreAllMocks());

	async function requestDailyReport(teamIds: string[], includeTimeWithoutTeam?: boolean) {
		jest.spyOn(timeLogService as never, 'organizationId', 'get').mockReturnValue('organization-a' as never);
		jest.spyOn(timeLogService as never, 'tenantId', 'get').mockReturnValue('tenant-a' as never);
		const get = jest.spyOn(timeLogService, 'get').mockResolvedValue({ data: [] } as never);

		await timeLogService.getTimeLogReportDaily({
			organizationId: 'organization-a',
			tenantId: 'tenant-a',
			startDate: '2026-11-05',
			endDate: '2026-11-05',
			teamIds,
			includeTimeWithoutTeam
		});

		const [url] = get.mock.calls[0];
		return new URL(url, 'https://client.test').searchParams;
	}

	it('asks for the time without a team of a team-scoped report', async () => {
		const query = await requestDailyReport(['team-a'], true);

		expect(query.get('includeTimeWithoutTeam')).toBe('true');
		expect(query.get('teamIds[0]')).toBe('team-a');
	});

	it('leaves it out of a report scoped to no team, or that does not ask for it', async () => {
		expect((await requestDailyReport([], true)).has('includeTimeWithoutTeam')).toBe(false);
		jest.restoreAllMocks();
		expect((await requestDailyReport(['team-a'])).has('includeTimeWithoutTeam')).toBe(false);
	});
});

function spyOnServiceGet() {
	jest.spyOn(timeLogService as never, 'organizationId', 'get').mockReturnValue('organization-a' as never);
	jest.spyOn(timeLogService as never, 'tenantId', 'get').mockReturnValue('tenant-a' as never);
	return jest.spyOn(timeLogService, 'get').mockResolvedValue({ data: [] } as never);
}

function sentQueryOf(get: ReturnType<typeof spyOnServiceGet>) {
	const [url] = get.mock.calls[0];
	return new URL(url, 'https://client.test').searchParams;
}

describe('TimeLogService reports of billable time only', () => {
	afterEach(() => jest.restoreAllMocks());

	const day = {
		organizationId: 'organization-a',
		tenantId: 'tenant-a',
		startDate: '2026-11-05',
		endDate: '2026-11-05'
	};
	const week = { startDate: '2026-11-02T00:00:00.000Z', endDate: '2026-11-08T23:59:59.999Z' };

	it('asks the daily report for billable time only when the filter is on', async () => {
		const get = spyOnServiceGet();

		await timeLogService.getTimeLogReportDaily({ ...day, billableOnly: true });

		expect(sentQueryOf(get).get('billableOnly')).toBe('true');
	});

	it('asks the weekly report for billable time only when the filter is on', async () => {
		const get = spyOnServiceGet();

		await timeLogService.getTimeLogReportWeekly({ ...week, billableOnly: true });

		expect(sentQueryOf(get).get('billableOnly')).toBe('true');
	});

	it('leaves the parameter out otherwise, so both reports keep counting every log', async () => {
		const dailyGet = spyOnServiceGet();
		await timeLogService.getTimeLogReportDaily(day);
		expect(sentQueryOf(dailyGet).has('billableOnly')).toBe(false);
		jest.restoreAllMocks();

		const weeklyGet = spyOnServiceGet();
		await timeLogService.getTimeLogReportWeekly({ ...week, billableOnly: false });
		expect(sentQueryOf(weeklyGet).has('billableOnly')).toBe(false);
	});
});

describe('TimeLogService time logs with the labels of their tasks', () => {
	afterEach(() => jest.restoreAllMocks());

	const period = { startDate: '2026-11-05', endDate: '2026-11-05', timeZone: 'UTC' };

	function relationsOf(query: URLSearchParams) {
		const relations: string[] = [];
		query.forEach((value, name) => {
			if (name.startsWith('relations[')) {
				relations.push(value);
			}
		});
		return relations;
	}

	it('asks for the labels of each task after the relations every page reads', async () => {
		const get = spyOnServiceGet();

		await timeLogService.getTimeLogs({ ...period, withTaskLabels: true });

		const query = sentQueryOf(get);
		const relations = relationsOf(query);
		expect(relations).toContain('task');
		expect(query.get(`relations[${relations.length - 1}]`)).toBe('task.tags');
	});

	it('keeps the request of the other pages as it was', async () => {
		const get = spyOnServiceGet();

		await timeLogService.getTimeLogs(period);

		expect(relationsOf(sentQueryOf(get))).not.toContain('task.tags');
	});
});
