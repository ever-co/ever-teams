import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import {
	activityBarPercentOf,
	activityWeeksCountOf,
	DEFAULT_ACTIVITY_WEEKS,
	MAX_ACTIVITY_WEEKS,
	MIN_ACTIVITY_WEEKS,
	projectActivityOf
} from './project-activity';

// Wednesday 11 November 2026, midday: the current week starts on Monday 9 November.
const NOW = new Date(2026, 10, 11, 12, 0, 0);
const STATUSES: TTaskStatus[] = [];

function taskOf(fields: { status?: string; createdAt?: Date | null; resolvedAt?: Date | null }): TTask {
	return { id: 'task', title: 'Task', public: false, ...fields } as unknown as TTask;
}

describe('projectActivityOf', () => {
	it('returns the requested number of Monday-based weeks, oldest first, ending with the current week', () => {
		const activity = projectActivityOf([], STATUSES, NOW, 3);

		expect(activity.weeks.map((week) => week.weekStart)).toEqual([
			new Date(2026, 9, 26),
			new Date(2026, 10, 2),
			new Date(2026, 10, 9)
		]);
		expect(activity.created).toBe(0);
		expect(activity.completed).toBe(0);
		expect(activity.peak).toBe(1);
	});

	it('counts a task as created in the week of its creation date', () => {
		const tasks = [
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 9, 0, 0, 0) }),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 11, 9, 0, 0) }),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 8, 23, 59, 59) })
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.weeks.map((week) => week.created)).toEqual([1, 2]);
		expect(activity.created).toBe(3);
		expect(activity.peak).toBe(2);
	});

	it('counts a done task in the week it was resolved, not the week it was created', () => {
		const tasks = [
			taskOf({
				status: 'done',
				createdAt: new Date(2026, 9, 1),
				resolvedAt: new Date(2026, 10, 3)
			})
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.weeks.map((week) => week.completed)).toEqual([1, 0]);
		expect(activity.weeks.map((week) => week.created)).toEqual([0, 0]);
	});

	it('does not count a reopened task that still has a resolution date', () => {
		const tasks = [taskOf({ status: 'in progress', resolvedAt: new Date(2026, 10, 10) })];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.completed).toBe(0);
		expect(activity.undatedDone).toBe(0);
	});

	it('reports done tasks without a resolution date instead of placing them in a week', () => {
		const tasks = [
			taskOf({ status: 'done', resolvedAt: null }),
			taskOf({ status: 'completed' }),
			taskOf({ status: 'done', resolvedAt: new Date(1970, 0, 1) })
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.completed).toBe(0);
		expect(activity.undatedDone).toBe(3);
	});

	it('ignores dates before the window and dates in the future', () => {
		const tasks = [
			taskOf({ status: 'done', createdAt: new Date(2026, 0, 5), resolvedAt: new Date(2026, 0, 6) }),
			taskOf({ status: 'done', createdAt: new Date(2026, 10, 20), resolvedAt: new Date(2026, 10, 21) })
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.created).toBe(0);
		expect(activity.completed).toBe(0);
		expect(activity.undatedDone).toBe(0);
	});

	// Local-time dates and a half-year window, so whatever clock changes the machine's timezone has inside it, every
	// Monday and Sunday midday must still land in its own calendar week (the test holds in any timezone).
	it('places a Monday and a Sunday of every week in that week over a half-year window', () => {
		const weeksCount = 26;
		const tasks: TTask[] = [];
		for (let back = 0; back < weeksCount; back += 1) {
			const mondayOfWeek = new Date(2026, 10, 9 - 7 * back, 12, 0, 0);
			const sundayBefore = new Date(2026, 10, 8 - 7 * back, 12, 0, 0);
			tasks.push(taskOf({ status: 'todo', createdAt: mondayOfWeek }));
			tasks.push(taskOf({ status: 'todo', createdAt: sundayBefore }));
		}

		const activity = projectActivityOf(tasks, STATUSES, NOW, weeksCount);

		// The oldest Sunday is before the window; the current week's own Sunday is not in the tasks.
		const expected = new Array<number>(weeksCount).fill(2);
		expected[weeksCount - 1] = 1;
		expect(activity.weeks.map((week) => week.created)).toEqual(expected);
		expect(activity.weeks.every((week) => week.weekStart.getDay() === 1)).toBe(true);
	});

	it('follows the statuses of the team when a custom status is marked done', () => {
		const statuses = [{ name: 'shipped', isDone: true }] as unknown as TTaskStatus[];
		const tasks = [taskOf({ status: 'shipped', resolvedAt: new Date(2026, 10, 10) })];

		const activity = projectActivityOf(tasks, statuses, NOW, 1);

		expect(activity.completed).toBe(1);
	});
});

describe('activityWeeksCountOf', () => {
	it('keeps the default when nothing usable is asked for', () => {
		expect(activityWeeksCountOf(undefined)).toBe(DEFAULT_ACTIVITY_WEEKS);
		expect(activityWeeksCountOf(Number.NaN)).toBe(DEFAULT_ACTIVITY_WEEKS);
		expect(activityWeeksCountOf(Number.POSITIVE_INFINITY)).toBe(DEFAULT_ACTIVITY_WEEKS);
	});

	it('bounds the window between one week and the maximum', () => {
		expect(activityWeeksCountOf(0)).toBe(MIN_ACTIVITY_WEEKS);
		expect(activityWeeksCountOf(-4)).toBe(MIN_ACTIVITY_WEEKS);
		expect(activityWeeksCountOf(10_000)).toBe(MAX_ACTIVITY_WEEKS);
		expect(activityWeeksCountOf(5.9)).toBe(5);
	});
});

describe('activityBarPercentOf', () => {
	it('draws no bar for an empty week and a sliver for a tiny one', () => {
		expect(activityBarPercentOf(0, 50)).toBe(0);
		expect(activityBarPercentOf(1, 1000)).toBe(4);
	});

	it('scales a week against the tallest one and never past the chart', () => {
		expect(activityBarPercentOf(5, 10)).toBe(50);
		expect(activityBarPercentOf(10, 10)).toBe(100);
		expect(activityBarPercentOf(12, 10)).toBe(100);
	});
});
