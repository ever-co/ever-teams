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
});
