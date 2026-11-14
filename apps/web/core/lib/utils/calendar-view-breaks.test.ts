import { describe, expect, it } from '@jest/globals';
import { endOfDay } from 'date-fns';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { calendarDaysOf, calendarEntriesOf, projectTotalsOf } from './calendar-view';

const EMPLOYEE_ID = 'employee-1';

const NOW = new Date(2026, 10, 20, 12);

/** Monday 9 to Sunday 15 November 2026, far from any change of clock. */
const WEEK: Period = { from: new Date(2026, 10, 9), to: endOfDay(new Date(2026, 10, 15)) };

const WEBSITE = { id: 'project-web', name: 'Website', color: '#123456' };

function logOf(id: string, startHour: number, endHour: number, logType: ETimeLogType): ITimeLog {
	return {
		id,
		employeeId: EMPLOYEE_ID,
		startedAt: new Date(2026, 10, 10, startHour),
		stoppedAt: new Date(2026, 10, 10, endHour),
		duration: 0,
		logType,
		projectId: WEBSITE.id,
		project: WEBSITE,
		task: { id: 'task-1', title: 'Checkout page' }
	} as unknown as ITimeLog;
}

// The acceptance day of #5216: work 9-12, a break 12-13 (taken on the running task), work 13-17
const DAY_WITH_A_BREAK = [
	logOf('morning', 9, 12, ETimeLogType.TRACKED),
	logOf('lunch', 12, 13, ETimeLogType.BREAK),
	logOf('afternoon', 13, 17, ETimeLogType.TRACKED)
];

function tuesdayOf() {
	const entries = calendarEntriesOf(DAY_WITH_A_BREAK, WEEK, EMPLOYEE_ID, NOW);
	const days = calendarDaysOf(WEEK, entries, new Map());
	const tuesday = days.find((day) => day.date.getDate() === 10);
	if (!tuesday) {
		throw new Error('Tuesday is not in the week');
	}
	return { days, tuesday };
}

describe('Calendar with breaks', () => {
	it('draws the break between the two entries, as a break with no project', () => {
		const { tuesday } = tuesdayOf();

		expect(tuesday.entries.map((entry) => [entry.id, entry.isBreak])).toEqual([
			['morning', false],
			['lunch', true],
			['afternoon', false]
		]);
		const lunch = tuesday.entries.find((entry) => entry.isBreak);
		expect(lunch?.projectKey).toBeNull();
		expect(lunch?.projectName).toBeNull();
	});

	it('counts 7 h worked that day and the hour of the break apart', () => {
		const { tuesday } = tuesdayOf();

		expect(tuesday.trackedSeconds).toBe(7 * 3600);
		expect(tuesday.manualSeconds).toBe(0);
		expect(tuesday.breakSeconds).toBe(3600);
	});

	it('gives the break to no project', () => {
		const { days } = tuesdayOf();

		expect(projectTotalsOf(days)).toEqual([
			{ key: WEBSITE.id, name: WEBSITE.name, color: WEBSITE.color, seconds: 7 * 3600 }
		]);
	});
});
