import { describe, expect, it } from '@jest/globals';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { groupLogsByWorkDay, totalDurationOf } from './timesheets';

function logOf(id: string, start: string, end: string, logType: ETimeLogType): ITimeLog {
	return {
		id,
		startedAt: new Date(start),
		stoppedAt: new Date(end),
		duration: 0,
		version: '1',
		logType
	} as unknown as ITimeLog;
}

// The acceptance day of #5216: work 9-12, a break 12-13, work 13-17
const day = [
	logOf('morning', '2026-11-10T09:00:00', '2026-11-10T12:00:00', ETimeLogType.TRACKED),
	logOf('lunch', '2026-11-10T12:00:00', '2026-11-10T13:00:00', ETimeLogType.BREAK),
	logOf('afternoon', '2026-11-10T13:00:00', '2026-11-10T17:00:00', ETimeLogType.TRACKED)
];

describe('Timesheets totals with breaks', () => {
	it('counts 7 h worked for the day, the break listed but left out of the total', () => {
		const [workDay] = groupLogsByWorkDay(day);

		expect(workDay.logs.map((log) => log.id)).toEqual(['morning', 'lunch', 'afternoon']);
		expect(workDay.totalSeconds).toBe(7 * 3600);
	});

	it('leaves breaks out of a selection total too', () => {
		expect(totalDurationOf(day)).toBe(7 * 3600);
	});
});
