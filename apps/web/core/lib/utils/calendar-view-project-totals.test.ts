import { endOfDay } from 'date-fns';
import type { Period } from '@/core/lib/utils/dashboard-period';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	calendarDaysOf,
	calendarEntriesOf,
	type CalendarProjectTotal,
	countedDaysOf,
	projectTotalsOf,
	trackedTotalOf,
	visibleRangeOf
} from './calendar-view';

const EMPLOYEE_ID = 'employee-1';

const NOW = new Date(2026, 11, 20, 12);

/** Monday 9 to Sunday 15 November 2026, far from any change of clock. */
const WEEK: Period = { from: new Date(2026, 10, 9), to: endOfDay(new Date(2026, 10, 15)) };

interface LogProject {
	id: string;
	name?: string;
	color?: string;
}

const WEBSITE: LogProject = { id: 'project-web', name: 'Website', color: '#123456' };
const API: LogProject = { id: 'project-api', name: 'API' };
const DOCS: LogProject = { id: 'project-docs', name: 'Docs', color: '#abcdef' };

function logOf(id: string, startedAt: Date, stoppedAt: Date, project: LogProject | null): ITimeLog {
	return {
		id,
		employeeId: EMPLOYEE_ID,
		startedAt,
		stoppedAt,
		duration: 0,
		projectId: project?.id,
		project: project ?? undefined
	} as unknown as ITimeLog;
}

/** A log that names a project Gauzy does not return with it (a deleted project): the id alone. */
function logWithProjectIdOnly(id: string, startedAt: Date, stoppedAt: Date, projectId: string): ITimeLog {
	return { id, employeeId: EMPLOYEE_ID, startedAt, stoppedAt, duration: 0, projectId } as unknown as ITimeLog;
}

function daysOf(logs: ITimeLog[], range: Period = WEEK) {
	const entries = calendarEntriesOf(logs, range, EMPLOYEE_ID, NOW);
	return calendarDaysOf(range, entries, new Map());
}

function secondsOf(totals: ReadonlyArray<CalendarProjectTotal>) {
	let seconds = 0;
	for (const total of totals) {
		seconds += total.seconds;
	}
	return seconds;
}

describe('projectTotalsOf', () => {
	it('adds up to the tracked total of the same days', () => {
		const days = daysOf([
			logOf('a', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10), WEBSITE),
			logOf('b', new Date(2026, 10, 10, 22), new Date(2026, 10, 11, 1, 30), API),
			logOf('c', new Date(2026, 10, 12, 9), new Date(2026, 10, 12, 9, 20), null),
			logOf('d', new Date(2026, 10, 13, 14), new Date(2026, 10, 13, 14, 30), WEBSITE)
		]);

		const totals = projectTotalsOf(days);

		expect(secondsOf(totals)).toBe(19200);
		expect(secondsOf(totals)).toBe(trackedTotalOf(days));
	});

	it('counts two entries of one project on two days as one total', () => {
		const days = daysOf([
			logOf('a', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10), WEBSITE),
			logOf('b', new Date(2026, 10, 12, 14), new Date(2026, 10, 12, 14, 30), WEBSITE)
		]);

		expect(projectTotalsOf(days)).toEqual([
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 5400 }
		]);
	});

	it('lists the projects from the largest to the smallest', () => {
		const days = daysOf([
			logOf('a', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10), WEBSITE),
			logOf('b', new Date(2026, 10, 10, 11), new Date(2026, 10, 10, 14), API),
			logOf('c', new Date(2026, 10, 11, 9), new Date(2026, 10, 11, 11), DOCS)
		]);

		const totals = projectTotalsOf(days);

		expect(totals.map((total) => [total.key, total.seconds])).toEqual([
			['project-api', 10800],
			['project-docs', 7200],
			['project-web', 3600]
		]);
	});

	it('puts the time without a project last, even when it is the largest', () => {
		const days = daysOf([
			logOf('a', new Date(2026, 10, 10, 8), new Date(2026, 10, 10, 13), null),
			logOf('b', new Date(2026, 10, 11, 9), new Date(2026, 10, 11, 10), WEBSITE),
			logOf('c', new Date(2026, 10, 12, 9), new Date(2026, 10, 12, 11), DOCS)
		]);

		expect(projectTotalsOf(days)).toEqual([
			{ key: 'project-docs', name: 'Docs', color: '#abcdef', seconds: 7200 },
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 3600 },
			{ key: null, name: null, color: null, seconds: 18000 }
		]);
	});

	it("counts each day's own part of a log that crosses midnight", () => {
		const days = daysOf([logOf('a', new Date(2026, 10, 10, 22), new Date(2026, 10, 11, 1, 30), WEBSITE)]);
		const tuesday = days.filter((day) => day.key === '2026-11-10');
		const wednesday = days.filter((day) => day.key === '2026-11-11');

		expect(projectTotalsOf(tuesday)).toEqual([
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 7200 }
		]);
		expect(projectTotalsOf(wednesday)).toEqual([
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 5400 }
		]);
		expect(projectTotalsOf(days)).toEqual([
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 12600 }
		]);
	});

	it('counts only the part inside the month of a log that runs into the next one, as the toolbar total does', () => {
		const november = new Date(2026, 10, 15);
		const monthGrid = visibleRangeOf('month', november, 1);
		const days = daysOf([logOf('a', new Date(2026, 10, 30, 22), new Date(2026, 11, 1, 2), WEBSITE)], monthGrid);
		const countedDays = countedDaysOf('month', days, november);

		const totals = projectTotalsOf(countedDays);

		expect(totals).toEqual([{ key: 'project-web', name: 'Website', color: '#123456', seconds: 7200 }]);
		expect(secondsOf(totals)).toBe(trackedTotalOf(countedDays));
	});

	it('takes the name and the colour of a project from a later entry when its first one came without them', () => {
		const bareWebsite: LogProject = { id: WEBSITE.id };
		const days = daysOf([
			logOf('a', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10), bareWebsite),
			logOf('b', new Date(2026, 10, 11, 9), new Date(2026, 10, 11, 9, 30), WEBSITE)
		]);

		expect(projectTotalsOf(days)).toEqual([
			{ key: 'project-web', name: 'Website', color: '#123456', seconds: 5400 }
		]);
	});

	it('counts a log that names a project Gauzy does not return as time without a project', () => {
		const days = daysOf([
			logWithProjectIdOnly('a', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10), 'project-gone'),
			logOf('b', new Date(2026, 10, 10, 11), new Date(2026, 10, 10, 11, 30), null)
		]);

		expect(projectTotalsOf(days)).toEqual([{ key: null, name: null, color: null, seconds: 5400 }]);
	});

	it('leaves out a project whose entries hold no time', () => {
		const startAndStop = new Date(2026, 10, 10, 9);
		const days = daysOf([
			logOf('a', startAndStop, startAndStop, API),
			logOf('b', new Date(2026, 10, 10, 10), new Date(2026, 10, 10, 11), WEBSITE)
		]);
		const entries = days.flatMap((day) => day.entries);

		expect(entries.map((entry) => [entry.projectKey, entry.daySeconds])).toEqual([
			['project-api', 0],
			['project-web', 3600]
		]);
		expect(projectTotalsOf(days).map((total) => total.key)).toEqual(['project-web']);
	});

	it('has no totals for a range without time', () => {
		expect(projectTotalsOf(daysOf([]))).toEqual([]);
		expect(projectTotalsOf([])).toEqual([]);
	});
});
