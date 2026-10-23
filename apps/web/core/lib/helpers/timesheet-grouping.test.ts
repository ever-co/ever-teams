/**
 * The daily timesheet groups entries by the day the viewer sees, not the UTC day: an entry made at 20:00 in New York
 * (01:00 UTC the next day) belongs to the evening it was made.
 */
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { groupByDate, localDateKey } from './timesheet-grouping';

const ORIGINAL_TZ = process.env.TZ;

afterEach(() => {
	process.env.TZ = ORIGINAL_TZ;
});

const log = (id: string, createdAt: string) =>
	({ id, timesheetId: `timesheet-${id}`, timesheet: { id: `timesheet-${id}`, createdAt } }) as unknown as ITimeLog;

describe('localDateKey', () => {
	it('gives the local day, zero-padded', () => {
		expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
	});
});

describe('groupByDate', () => {
	it("groups an evening entry west of UTC under that evening's day", () => {
		process.env.TZ = 'America/New_York';

		const groups = groupByDate([log('a', '2026-10-24T00:30:00.000Z')]);

		// 00:30 UTC on the 24th is 20:30 on the 23rd in New York
		expect(groups.map((group) => group.date)).toEqual([localDateKey(new Date('2026-10-24T00:30:00.000Z'))]);
		expect(groups[0].date).toBe('2026-10-23');
	});
});
