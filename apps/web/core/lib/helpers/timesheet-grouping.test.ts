/**
 * The daily timesheet groups entries by the day the viewer sees, not the UTC day: an entry made at 20:00 in New York
 * (01:00 UTC the next day) belongs to the evening it was made. Jest sandboxes process.env, so the time zone cannot be
 * switched here: the checks compare with the local day of the runner, whatever its zone.
 */
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { groupByDate, localDateKey } from './timesheet-grouping';

const log = (id: string, createdAt: string) =>
	({ id, timesheetId: `timesheet-${id}`, timesheet: { id: `timesheet-${id}`, createdAt } }) as unknown as ITimeLog;

describe('localDateKey', () => {
	it('gives the local day, zero-padded', () => {
		expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
		expect(localDateKey(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
	});
});

describe('groupByDate', () => {
	it('groups an entry under its local day', () => {
		// Local 23:30: in every zone but UTC its UTC day differs from the local one on one side of midnight
		const lateEvening = new Date(2026, 9, 23, 23, 30);
		const earlyMorning = new Date(2026, 9, 24, 0, 30);

		const groups = groupByDate([log('a', lateEvening.toISOString()), log('b', earlyMorning.toISOString())]);

		expect(groups.map((group) => group.date).sort()).toEqual(['2026-10-23', '2026-10-24']);
	});
});
