import {
	calendarDayData,
	calendarMoveOf,
	calendarTaskData,
	canDropOnDay,
	isCalendarTaskData
} from './team-tasks-calendar-drop';

const DAY_14 = 20_771;
const DAY_17 = DAY_14 + 3;
const DAY_10 = DAY_14 - 4;

describe('a task of the calendar dragged over a day', () => {
	it('can go to any day but the one it is due on', () => {
		const dueOn14 = calendarTaskData('a', DAY_14, DAY_10);

		expect(canDropOnDay(dueOn14, DAY_17)).toBe(true);
		expect(canDropOnDay(dueOn14, DAY_10 - 5)).toBe(true);
		expect(canDropOnDay(dueOn14, DAY_14)).toBe(false);
	});

	it('without a due date, can go to its start or later, never before', () => {
		const startsOn14 = calendarTaskData('u', null, DAY_14);
		const undated = calendarTaskData('v', null, null);

		expect(canDropOnDay(startsOn14, DAY_14)).toBe(true);
		expect(canDropOnDay(startsOn14, DAY_17)).toBe(true);
		expect(canDropOnDay(startsOn14, DAY_10)).toBe(false);
		expect(canDropOnDay(undated, DAY_10)).toBe(true);
	});

	it('is told apart from anything else dragged over the page', () => {
		const otherDrag = { taskId: 'a', dueDay: DAY_14, startDay: null };

		expect(isCalendarTaskData(calendarTaskData('a', DAY_14, null))).toBe(true);
		expect(isCalendarTaskData(otherDrag)).toBe(false);
		expect(canDropOnDay(otherDrag, DAY_17)).toBe(false);
	});
});

describe('the move a drop on a day makes', () => {
	it('moves the task to the day it is dropped on', () => {
		const move = calendarMoveOf(calendarTaskData('a', DAY_14, null), calendarDayData(DAY_17));

		expect(move).toEqual({ taskId: 'a', day: DAY_17 });
	});

	it('makes none on its own day, before the start of an undated task, or onto something else', () => {
		const dueOn14 = calendarTaskData('a', DAY_14, null);
		const startsOn14 = calendarTaskData('u', null, DAY_14);

		expect(calendarMoveOf(dueOn14, calendarDayData(DAY_14))).toBeNull();
		expect(calendarMoveOf(startsOn14, calendarDayData(DAY_10))).toBeNull();
		expect(calendarMoveOf(dueOn14, { day: DAY_17 })).toBeNull();
		expect(calendarMoveOf({ taskId: 'a' }, calendarDayData(DAY_17))).toBeNull();
	});
});
