import { getDaysInMonth, isSameDay } from 'date-fns';
import type { WeekStart } from './dashboard-period';
import {
	droppedTaskDatesOf,
	teamTasksCalendarMonthOf,
	type TeamTasksCalendarDay,
	type TeamTasksCalendarMonth
} from './team-tasks-calendar';
import { dayNumberOf } from './team-tasks-timeline';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const NOVEMBER = new Date(2026, 10, 1);
const TODAY = new Date(2026, 10, 12, 15, 30); // 12 Nov 2026, afternoon, local
const MONDAY: WeekStart = 1;
const SUNDAY: WeekStart = 0;
const WEEK_STARTS: WeekStart[] = [MONDAY, SUNDAY];
const MONTH_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const task = (id: string, dueDate?: Date | string | null) => ({ id, dueDate }) as unknown as TTask;

const idsOf = (tasks: readonly TTask[]) => tasks.map((item) => item.id);

function daysOf(month: TeamTasksCalendarMonth) {
	return month.weeks.flat();
}

function dayOn(month: TeamTasksCalendarMonth, date: Date): TeamTasksCalendarDay {
	const day = daysOf(month).find((candidate) => isSameDay(candidate.date, date));
	if (!day) {
		throw new Error(`${date.toDateString()} is not among the days shown`);
	}
	return day;
}

function placedIdsOf(month: TeamTasksCalendarMonth) {
	const ids: string[] = [];
	for (const day of daysOf(month)) {
		ids.push(...idsOf(day.tasks));
	}
	return ids;
}

describe('the weeks of a month of tasks', () => {
	it('shows six whole weeks for every month, each from the first day of the week', () => {
		for (const weekStartsOn of WEEK_STARTS) {
			for (const monthIndex of MONTH_INDEXES) {
				const anchor = new Date(2026, monthIndex, 15);
				const month = teamTasksCalendarMonthOf([], anchor, weekStartsOn, TODAY);
				const days = daysOf(month);
				const firstDayNumber = days[0].dayNumber;
				const monthDays = days.filter((day) => !day.isOutsideMonth);
				const which = `month ${monthIndex}, week from ${weekStartsOn}`;

				const weekLengths = month.weeks.map((week) => week.length);
				expect({ which, weekLengths }).toEqual({ which, weekLengths: [7, 7, 7, 7, 7, 7] });

				const weekdaysOfFirstDays = month.weeks.map((week) => week[0].date.getDay());
				const sixWeekStarts = Array.from({ length: 6 }, () => weekStartsOn);
				expect({ which, weekdaysOfFirstDays }).toEqual({ which, weekdaysOfFirstDays: sixWeekStarts });

				const daysFromFirst = days.map((day) => day.dayNumber - firstDayNumber);
				const fortyTwoDaysInARow = Array.from({ length: 42 }, (_, index) => index);
				expect({ which, daysFromFirst }).toEqual({ which, daysFromFirst: fortyTwoDaysInARow });

				const datesOfMonth = monthDays.map((day) => day.date.getDate());
				const everyDateOfMonth = Array.from({ length: getDaysInMonth(anchor) }, (_, index) => index + 1);
				expect({ which, datesOfMonth }).toEqual({ which, datesOfMonth: everyDateOfMonth });

				const monthsOfMonthDays = new Set(monthDays.map((day) => day.date.getMonth()));
				expect({ which, months: [...monthsOfMonthDays] }).toEqual({ which, months: [monthIndex] });
			}
		}
	});

	it('starts November 2026 on Monday 26 October, or on Sunday 1 November, and ends six weeks later', () => {
		const fromMonday = daysOf(teamTasksCalendarMonthOf([], NOVEMBER, MONDAY, TODAY));
		expect(isSameDay(fromMonday[0].date, new Date(2026, 9, 26))).toBe(true);
		expect(isSameDay(fromMonday[41].date, new Date(2026, 11, 6))).toBe(true);

		const fromSunday = daysOf(teamTasksCalendarMonthOf([], NOVEMBER, SUNDAY, TODAY));
		expect(isSameDay(fromSunday[0].date, new Date(2026, 10, 1))).toBe(true);
		expect(isSameDay(fromSunday[41].date, new Date(2026, 11, 12))).toBe(true);
	});

	it('keeps six weeks for a month that fits in four (February 2026, weeks from Sunday)', () => {
		const february = new Date(2026, 1, 1);
		const month = teamTasksCalendarMonthOf([], february, SUNDAY, TODAY);
		const days = daysOf(month);
		const outsideWeeks = month.weeks.filter((week) => week.every((day) => day.isOutsideMonth));

		expect(isSameDay(days[0].date, february)).toBe(true);
		expect(isSameDay(days[41].date, new Date(2026, 2, 14))).toBe(true);
		expect(outsideWeeks).toHaveLength(2);
	});
});

describe('the day a task is due on', () => {
	// The reader's zone is the one the run starts in (`TZ=America/Los_Angeles npx jest …`): a test only has a copy of
	// `process.env`, so a zone set from here changes nothing.
	it('puts a bare date, midnight UTC as text and midnight UTC as a Date on the day they name', () => {
		const tasks = [
			task('bare', '2026-11-20'),
			task('iso', '2026-11-20T00:00:00.000Z'),
			task('date', new Date('2026-11-20T00:00:00.000Z'))
		];
		const month = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);
		const november20 = dayOn(month, new Date(2026, 10, 20));

		expect(idsOf(november20.tasks)).toEqual(['bare', 'iso', 'date']);
		expect(placedIdsOf(month)).toEqual(['bare', 'iso', 'date']);
		expect(month.dueInMonthCount).toBe(3);
	});

	it('puts a Date at any other moment on the reader’s day of that moment', () => {
		const morning = new Date(2026, 10, 20, 10, 17);
		const lateEvening = new Date(2026, 10, 20, 23, 43);
		const month = teamTasksCalendarMonthOf(
			[task('morning', morning), task('evening', lateEvening)],
			NOVEMBER,
			MONDAY,
			TODAY
		);

		expect(idsOf(dayOn(month, new Date(2026, 10, 20)).tasks)).toEqual(['morning', 'evening']);
	});

	it('sets a task without a due date apart, in the order given, and on no day', () => {
		const tasks = [
			task('missing'),
			task('dated', '2026-11-20'),
			task('null', null),
			task('empty', ''),
			task('unreadable', 'not a date')
		];
		const month = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);

		expect(idsOf(month.undated)).toEqual(['missing', 'null', 'empty', 'unreadable']);
		expect(placedIdsOf(month)).toEqual(['dated']);
		expect(month.dueInMonthCount).toBe(1);
	});

	it('shows a task due in the days of a neighbouring month on its day, without counting it in the month', () => {
		const tasks = [task('before', '2026-10-28'), task('inside', '2026-11-05'), task('after', '2026-12-03')];
		const month = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);
		const october28 = dayOn(month, new Date(2026, 9, 28));
		const december3 = dayOn(month, new Date(2026, 11, 3));

		expect(idsOf(october28.tasks)).toEqual(['before']);
		expect(october28.isOutsideMonth).toBe(true);
		expect(idsOf(december3.tasks)).toEqual(['after']);
		expect(december3.isOutsideMonth).toBe(true);
		expect(dayOn(month, new Date(2026, 10, 5)).isOutsideMonth).toBe(false);
		expect(month.dueInMonthCount).toBe(1);
		expect(month.undated).toEqual([]);
	});

	it('leaves a task due outside the six weeks on no day and out of the undated ones, until its month is shown', () => {
		const tasks = [task('january', '2027-01-20')];
		const november = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);
		const january = teamTasksCalendarMonthOf(tasks, new Date(2027, 0, 1), MONDAY, TODAY);

		expect(placedIdsOf(november)).toEqual([]);
		expect(november.undated).toEqual([]);
		expect(november.dueInMonthCount).toBe(0);
		expect(idsOf(dayOn(january, new Date(2027, 0, 20)).tasks)).toEqual(['january']);
		expect(january.dueInMonthCount).toBe(1);
	});

	it('keeps the tasks of a day in the order they were given', () => {
		const tasks = [
			task('c', '2026-11-20'),
			task('other', '2026-11-21'),
			task('a', '2026-11-20T00:00:00.000Z'),
			task('b', '2026-11-20')
		];
		const month = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);

		expect(idsOf(dayOn(month, new Date(2026, 10, 20)).tasks)).toEqual(['c', 'a', 'b']);
		expect(idsOf(dayOn(month, new Date(2026, 10, 21)).tasks)).toEqual(['other']);
	});
});

describe('today and the days before it', () => {
	it('marks the day of `today` alone as today, and the days before it as past', () => {
		const month = teamTasksCalendarMonthOf([], NOVEMBER, MONDAY, TODAY);
		const yesterday = dayOn(month, new Date(2026, 10, 11));
		const today = dayOn(month, new Date(2026, 10, 12));
		const tomorrow = dayOn(month, new Date(2026, 10, 13));
		const todays = daysOf(month).filter((day) => day.isToday);
		const pastDays = daysOf(month).filter((day) => day.isPast);

		expect([yesterday.isToday, yesterday.isPast]).toEqual([false, true]);
		expect([today.isToday, today.isPast]).toEqual([true, false]);
		expect([tomorrow.isToday, tomorrow.isPast]).toEqual([false, false]);
		expect(todays).toHaveLength(1);
		// 26 October to 11 November.
		expect(pastDays).toHaveLength(17);
	});

	it('follows the `today` it is given, at any time of that day', () => {
		const firstMinute = teamTasksCalendarMonthOf([], NOVEMBER, MONDAY, new Date(2026, 10, 20, 0, 0));
		const lastMinute = teamTasksCalendarMonthOf([], NOVEMBER, MONDAY, new Date(2026, 10, 20, 23, 59));

		for (const month of [firstMinute, lastMinute]) {
			expect(dayOn(month, new Date(2026, 10, 20)).isToday).toBe(true);
			expect(dayOn(month, new Date(2026, 10, 12)).isToday).toBe(false);
			expect(dayOn(month, new Date(2026, 10, 19)).isPast).toBe(true);
			expect(dayOn(month, new Date(2026, 10, 20)).isPast).toBe(false);
		}
	});

	it('has no today in a month before it, where every day is past, nor in a month after it, where none is', () => {
		const september = daysOf(teamTasksCalendarMonthOf([], new Date(2026, 8, 1), MONDAY, TODAY));
		const january = daysOf(teamTasksCalendarMonthOf([], new Date(2027, 0, 1), MONDAY, TODAY));

		expect(september.some((day) => day.isToday)).toBe(false);
		expect(september.every((day) => day.isPast)).toBe(true);
		expect(january.some((day) => day.isToday)).toBe(false);
		expect(january.some((day) => day.isPast)).toBe(false);
	});
});

describe('the busy days of a month', () => {
	it('lists the days of the month itself that have a task due, in the order of the days', () => {
		const tasks = [
			task('late', '2026-11-20'),
			task('before', '2026-10-28'),
			task('early', '2026-11-05'),
			task('after', '2026-12-03'),
			task('late too', '2026-11-20'),
			task('undated')
		];
		const month = teamTasksCalendarMonthOf(tasks, NOVEMBER, MONDAY, TODAY);
		const busyDates = month.busyDays.map((day) => day.date.getDate());
		const busyIds = month.busyDays.map((day) => idsOf(day.tasks));

		expect(busyDates).toEqual([5, 20]);
		expect(busyIds).toEqual([['early'], ['late', 'late too']]);
		expect(month.busyDays.every((day) => !day.isOutsideMonth)).toBe(true);
		expect(month.dueInMonthCount).toBe(3);
	});

	it('is empty for a month with nothing due, the neighbouring months aside', () => {
		const month = teamTasksCalendarMonthOf([task('before', '2026-10-28')], NOVEMBER, MONDAY, TODAY);

		expect(month.busyDays).toEqual([]);
		expect(month.dueInMonthCount).toBe(0);
	});
});

describe('a task dropped on a day', () => {
	const november = (date: number) => dayNumberOf(new Date(2026, 10, date));

	it('falls due that day, as a local midnight', () => {
		expect(droppedTaskDatesOf({ dueDate: '2026-11-14' }, november(17))).toEqual({
			dueDate: new Date(2026, 10, 17)
		});
		expect(droppedTaskDatesOf({ dueDate: '2026-11-14T00:00:00.000Z' }, november(9))).toEqual({
			dueDate: new Date(2026, 10, 9)
		});
	});

	it('keeps its length: its start moves by as many days as its due date', () => {
		const tenToFourteen = { startDate: '2026-11-10', dueDate: '2026-11-14' };

		expect(droppedTaskDatesOf(tenToFourteen, november(17))).toEqual({
			startDate: new Date(2026, 10, 13),
			dueDate: new Date(2026, 10, 17)
		});
		expect(droppedTaskDatesOf(tenToFourteen, november(2))).toEqual({
			startDate: new Date(2026, 9, 29),
			dueDate: new Date(2026, 10, 2)
		});
	});

	it('gets a due date when it had none, and keeps its start', () => {
		expect(droppedTaskDatesOf({ dueDate: null }, november(20))).toEqual({ dueDate: new Date(2026, 10, 20) });
		expect(droppedTaskDatesOf({ startDate: '2026-11-18' }, november(20))).toEqual({
			dueDate: new Date(2026, 10, 20)
		});
		expect(droppedTaskDatesOf({ startDate: '2026-11-18' }, november(18))).toEqual({
			dueDate: new Date(2026, 10, 18)
		});
	});

	it('changes nothing on the day it is due, nor before the start of a task without a due date', () => {
		expect(droppedTaskDatesOf({ startDate: '2026-11-10', dueDate: '2026-11-14' }, november(14))).toBeNull();
		expect(droppedTaskDatesOf({ startDate: '2026-11-18' }, november(17))).toBeNull();
	});
});
