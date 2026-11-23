import { runInThisContext } from 'node:vm';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import {
	activityBarPercentOf,
	activityWeeksCountOf,
	DEFAULT_ACTIVITY_WEEKS,
	MAX_ACTIVITY_WEEKS,
	MAX_FORECAST_WEEKS,
	MIN_ACTIVITY_WEEKS,
	projectActivityOf,
	projectForecastOf
} from './project-activity';

// Wednesday 11 November 2026, midday: the current week starts on Monday 9 November.
const NOW = new Date(2026, 10, 11, 12, 0, 0);
const STATUSES: TTaskStatus[] = [];

// Jest hands each test file a copy of process.env, where TZ changes nothing. The zone is set on the real process,
// reached through node:vm (Node re-reads TZ on assignment), and put back after each case.
const realProcess = runInThisContext('process') as NodeJS.Process;

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

	it('counts a task created or completed later in the current week than the time it was asked for', () => {
		// The chart keeps one `now` for the whole week: work done after the page was opened must still show.
		const tasks = [
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 11, 15, 0, 0) }),
			taskOf({
				status: 'done',
				createdAt: new Date(2026, 10, 2),
				resolvedAt: new Date(2026, 10, 15, 23, 59, 0)
			})
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.weeks.map((week) => week.created)).toEqual([1, 1]);
		expect(activity.weeks.map((week) => week.completed)).toEqual([0, 1]);
	});

	it('ignores dates before the window and dates after the current week', () => {
		const tasks = [
			taskOf({ status: 'done', createdAt: new Date(2026, 0, 5), resolvedAt: new Date(2026, 0, 6) }),
			taskOf({ status: 'done', createdAt: new Date(2026, 10, 20), resolvedAt: new Date(2026, 10, 21) })
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2);

		expect(activity.created).toBe(0);
		expect(activity.completed).toBe(0);
		expect(activity.undatedDone).toBe(0);
	});

	// The timezone is pinned to zones that change their clocks inside the 26-week window (northern autumn for New York
	// and Berlin, southern spring for Sydney), so the daylight-saving edge is always exercised, whatever the machine's own
	// timezone is. Every Monday and Sunday midday must still land in its own calendar week.
	it.each(['America/New_York', 'Europe/Berlin', 'Australia/Sydney'])(
		'places a Monday and a Sunday of every week in that week across a clock change in %s',
		(zone) => {
			const previousZone = realProcess.env.TZ;
			realProcess.env.TZ = zone;
			try {
				const weeksCount = 26;
				const now = new Date(2026, 10, 11, 12, 0, 0);
				const windowStart = new Date(2026, 4, 18, 12, 0, 0);
				expect(windowStart.getTimezoneOffset()).not.toBe(now.getTimezoneOffset());

				const tasks: TTask[] = [];
				for (let back = 0; back < weeksCount; back += 1) {
					const mondayOfWeek = new Date(2026, 10, 9 - 7 * back, 12, 0, 0);
					const sundayBefore = new Date(2026, 10, 8 - 7 * back, 12, 0, 0);
					tasks.push(taskOf({ status: 'todo', createdAt: mondayOfWeek }));
					tasks.push(taskOf({ status: 'todo', createdAt: sundayBefore }));
				}

				const activity = projectActivityOf(tasks, STATUSES, now, weeksCount);

				// The oldest Sunday is before the window; the current week's own Sunday is not in the tasks.
				const expected = new Array<number>(weeksCount).fill(2);
				expected[weeksCount - 1] = 1;
				expect(activity.weeks.map((week) => week.created)).toEqual(expected);
				expect(activity.weeks.every((week) => week.weekStart.getDay() === 1)).toBe(true);
			} finally {
				if (previousZone === undefined) delete realProcess.env.TZ;
				else realProcess.env.TZ = previousZone;
			}
		}
	);

	it('follows the statuses of the team when a custom status is marked done', () => {
		const statuses = [{ name: 'shipped', isDone: true }] as unknown as TTaskStatus[];
		const tasks = [taskOf({ status: 'shipped', resolvedAt: new Date(2026, 10, 10) })];

		const activity = projectActivityOf(tasks, statuses, NOW, 1);

		expect(activity.completed).toBe(1);
	});
});

describe('projectForecastOf', () => {
	// Four weeks starting Monday 19 October; the last one (from 9 November) is the running week.
	const WEEKS = 4;
	const OLD = new Date(2026, 0, 5);

	function doneOn(date: Date, createdAt: Date = OLD) {
		return taskOf({ status: 'done', createdAt, resolvedAt: date });
	}

	function forecastOf(tasks: TTask[], weekStartsOn?: 0 | 1) {
		const activity = projectActivityOf(tasks, STATUSES, NOW, WEEKS, weekStartsOn);
		return projectForecastOf(tasks, STATUSES, activity, weekStartsOn);
	}

	it('divides the open tasks by the weekly pace of the complete weeks and rounds up to whole weeks', () => {
		const tasks = [
			doneOn(new Date(2026, 9, 20)),
			doneOn(new Date(2026, 9, 27)),
			doneOn(new Date(2026, 10, 3)),
			doneOn(new Date(2026, 10, 4)),
			taskOf({ status: 'todo', createdAt: OLD }),
			taskOf({ status: 'in progress', createdAt: OLD }),
			taskOf({ status: 'todo', createdAt: OLD })
		];

		// 4 done over 3 complete weeks = 1.3 a week; 3 open / (4 / 3) = 2.25 -> 3 weeks.
		expect(forecastOf(tasks)).toEqual({ open: 3, velocity: 1.3, weeksLeft: 3, isBeyondHorizon: false });
	});

	it('does not add a week when the open tasks divide the pace exactly', () => {
		const tasks = [
			doneOn(new Date(2026, 9, 20)),
			doneOn(new Date(2026, 9, 21)),
			doneOn(new Date(2026, 9, 27)),
			doneOn(new Date(2026, 9, 28)),
			doneOn(new Date(2026, 10, 3)),
			doneOn(new Date(2026, 10, 4)),
			...Array.from({ length: 4 }, () => taskOf({ status: 'todo', createdAt: OLD }))
		];

		// 6 done over 3 weeks = 2 a week; 4 open = exactly 2 weeks.
		expect(forecastOf(tasks)?.weeksLeft).toBe(2);
	});

	it('leaves the running week out of the pace', () => {
		const tasks = [
			doneOn(new Date(2026, 9, 20)),
			doneOn(new Date(2026, 10, 10)),
			doneOn(new Date(2026, 10, 11)),
			doneOn(new Date(2026, 10, 11)),
			taskOf({ status: 'todo', createdAt: OLD })
		];

		expect(forecastOf(tasks)?.velocity).toBe(0.3);
	});

	it('starts the pace at the week of the first task when the project is younger than the window', () => {
		const tasks = [
			doneOn(new Date(2026, 10, 3), new Date(2026, 10, 2)),
			doneOn(new Date(2026, 10, 4), new Date(2026, 10, 2)),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 2) })
		];

		// Only the week of 2 November is complete and counted: not enough history for a pace.
		expect(forecastOf(tasks)).toBeNull();
		const older = [...tasks, taskOf({ status: 'todo', createdAt: new Date(2026, 9, 26) })];
		// Two complete weeks (26 October and 2 November), 2 done: 1 a week, 2 open.
		expect(forecastOf(older)).toEqual({ open: 2, velocity: 1, weeksLeft: 2, isBeyondHorizon: false });
	});

	it('keeps the whole window when a task has no creation date, instead of cutting at the dated tasks', () => {
		const tasks = [
			taskOf({ status: 'done', createdAt: null, resolvedAt: new Date(2026, 9, 20) }),
			taskOf({ status: 'done', createdAt: null, resolvedAt: new Date(2026, 9, 27) }),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 2) })
		];

		// 2 done over the 3 complete weeks, 1 open: 0.7 a week, 2 weeks.
		expect(forecastOf(tasks)).toEqual({ open: 1, velocity: 0.7, weeksLeft: 2, isBeyondHorizon: false });
	});

	it('keeps a completion from three weeks ago that has no creation date next to a task created last week', () => {
		const tasks = [
			taskOf({ status: 'done', resolvedAt: new Date(2026, 9, 21) }),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 2) })
		];

		expect(forecastOf(tasks)).toEqual({ open: 1, velocity: 0.3, weeksLeft: 3, isBeyondHorizon: false });
	});

	it('does not cut off completions that predate the recorded creation dates', () => {
		const tasks = [
			taskOf({ status: 'done', createdAt: new Date(2026, 10, 2), resolvedAt: new Date(2026, 9, 20) }),
			taskOf({ status: 'done', createdAt: new Date(2026, 10, 2), resolvedAt: new Date(2026, 9, 27) }),
			taskOf({ status: 'todo', createdAt: new Date(2026, 10, 2) })
		];

		expect(forecastOf(tasks)).toEqual({ open: 1, velocity: 0.7, weeksLeft: 2, isBeyondHorizon: false });
	});

	it('gives no forecast when nothing is open, nothing was completed, or there are no tasks', () => {
		expect(forecastOf([])).toBeNull();
		expect(forecastOf([doneOn(new Date(2026, 9, 20))])).toBeNull();
		expect(forecastOf([taskOf({ status: 'todo', createdAt: OLD })])).toBeNull();
	});

	it('caps a distant finish and says it is beyond the horizon', () => {
		const tasks = [
			doneOn(new Date(2026, 9, 20)),
			...Array.from({ length: 500 }, () => taskOf({ status: 'todo', createdAt: OLD }))
		];

		const forecast = forecastOf(tasks);

		expect(forecast?.weeksLeft).toBe(MAX_FORECAST_WEEKS);
		expect(forecast?.isBeyondHorizon).toBe(true);
	});

	it('does not count a done task without a resolution date towards the pace', () => {
		const tasks = [
			taskOf({ status: 'done', createdAt: OLD, resolvedAt: null }),
			taskOf({ status: 'todo', createdAt: OLD })
		];

		expect(forecastOf(tasks)).toBeNull();
	});

	it('works with a workspace whose week starts on Sunday', () => {
		const tasks = [
			doneOn(new Date(2026, 9, 21)),
			doneOn(new Date(2026, 10, 4)),
			taskOf({ status: 'todo', createdAt: OLD })
		];

		expect(forecastOf(tasks, 0)).toEqual({ open: 1, velocity: 0.7, weeksLeft: 2, isBeyondHorizon: false });
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

describe('projectActivityOf on the workspace week start', () => {
	it('cuts Sunday weeks and counts a task created on Sunday 8 November in the week it opens', () => {
		const tasks = [
			taskOf({ createdAt: new Date(2026, 10, 7, 10) }),
			taskOf({ createdAt: new Date(2026, 10, 8, 10) })
		];

		const activity = projectActivityOf(tasks, STATUSES, NOW, 2, 0);

		expect(activity.weeks.map((week) => week.weekStart)).toEqual([new Date(2026, 10, 1), new Date(2026, 10, 8)]);
		expect(activity.weeks.map((week) => week.created)).toEqual([1, 1]);
	});
});
