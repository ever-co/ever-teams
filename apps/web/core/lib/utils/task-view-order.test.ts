import {
	groupTaskIdsOf,
	orderAfterMove,
	sortByManualOrder,
	stepMoveOf,
	TASK_VIEW_ORDER_MAX,
	type TaskOrderMove
} from './task-view-order';
import {
	buildTeamTasksGroups,
	DEFAULT_TEAM_TASKS_VIEW,
	flattenTeamTasksGroups,
	sortTeamTasks
} from './team-tasks-view';
import { SAVED_VIEW_ORDERINGS, viewSettingsFromStorage } from './team-tasks-view-storage';
import { definitionOf } from './task-views';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const task = (id: string, createdAt?: string, extra: Partial<TTask> = {}) => ({ id, createdAt, ...extra }) as TTask;
const idsOf = (tasks: { id: string }[]) => tasks.map((item) => item.id);
const move = (taskId: string, targetId: string, edge: TaskOrderMove['edge']): TaskOrderMove => ({
	taskId,
	targetId,
	edge
});

describe('sortByManualOrder', () => {
	it('puts the tasks the order names first, in that order, then the others newest first, as the platform pages them', () => {
		const tasks = [
			task('a', '2026-01-01'),
			task('b', '2026-03-01'),
			task('c', '2026-02-01'),
			task('d', '2026-04-01'),
			task('e')
		];
		expect(idsOf(sortByManualOrder(tasks, ['c', 'a']))).toEqual(['c', 'a', 'd', 'b', 'e']);
	});

	it('reads an order with repeated or vanished ids, and no order at all', () => {
		const tasks = [task('a', '2026-01-01'), task('b', '2026-02-01')];
		expect(idsOf(sortByManualOrder(tasks, ['gone', 'a', 'a']))).toEqual(['a', 'b']);
		expect(idsOf(sortByManualOrder(tasks, null))).toEqual(['b', 'a']);
	});

	it('breaks a tie of creation by id, newest id first', () => {
		expect(idsOf(sortByManualOrder([task('a', '2026-01-01'), task('b', '2026-01-01')], []))).toEqual(['b', 'a']);
	});
});

describe('orderAfterMove', () => {
	it('puts the task right before or right after its target, the shown tasks the order did not name kept as shown', () => {
		// The list shows c, a (named), then d, b (not named yet).
		const shown = ['c', 'a', 'd', 'b'];
		expect(orderAfterMove(['c', 'a'], shown, move('b', 'c', 'before'))).toEqual(['b', 'c', 'a', 'd']);
		expect(orderAfterMove(['c', 'a'], shown, move('c', 'd', 'after'))).toEqual(['a', 'd', 'c', 'b']);
	});

	it('keeps the places of the tasks the list does not show (done, filtered out)', () => {
		// x and y are named by the order but hidden; the list shows a, b, c.
		const next = orderAfterMove(['x', 'a', 'y', 'b', 'c'], ['a', 'b', 'c'], move('c', 'a', 'before'));
		expect(next).toEqual(['x', 'c', 'a', 'y', 'b']);
	});

	it('is null when the list would not change: dropped on itself, where it already is, or a task not shown', () => {
		const shown = ['a', 'b', 'c'];
		expect(orderAfterMove([], shown, move('a', 'a', 'before'))).toBeNull();
		expect(orderAfterMove([], shown, move('a', 'b', 'before'))).toBeNull();
		expect(orderAfterMove([], shown, move('b', 'a', 'after'))).toBeNull();
		// Hidden tasks between two shown ones do not count as a change.
		expect(orderAfterMove(['a', 'hidden', 'b'], shown, move('a', 'b', 'before'))).toBeNull();
		expect(orderAfterMove([], shown, move('z', 'a', 'before'))).toBeNull();
		expect(orderAfterMove([], shown, move('a', 'z', 'before'))).toBeNull();
	});

	it('applies the same move to an order someone else saved meanwhile (the rebase after a conflict)', () => {
		const shown = ['a', 'b', 'c', 'd'];
		const mine = move('d', 'b', 'before');
		expect(orderAfterMove(['a', 'b', 'c', 'd'], shown, mine)).toEqual(['a', 'd', 'b', 'c']);
		// Someone put c first meanwhile: d still lands right before b, and c stays first.
		expect(orderAfterMove(['c', 'a', 'b', 'd'], shown, mine)).toEqual(['c', 'a', 'd', 'b']);
	});

	it('holds at most the platform limit, dropping tasks the list does not show first', () => {
		const hidden = Array.from({ length: TASK_VIEW_ORDER_MAX }, (_, index) => `h${index}`);
		const next = orderAfterMove([...hidden, 'a'], ['a', 'b'], move('b', 'a', 'before'));
		expect(next).toHaveLength(TASK_VIEW_ORDER_MAX);
		expect(next?.slice(-2)).toEqual(['b', 'a']);
		expect(next).not.toContain(`h${TASK_VIEW_ORDER_MAX - 1}`);
	});
});

describe('stepMoveOf', () => {
	const group = ['a', 'b', 'c', 'd'];

	it('moves a task one place up or down, or to the top or the bottom of its group', () => {
		expect(stepMoveOf(group, 'c', 'up')).toEqual(move('c', 'b', 'before'));
		expect(stepMoveOf(group, 'b', 'down')).toEqual(move('b', 'c', 'after'));
		expect(stepMoveOf(group, 'c', 'top')).toEqual(move('c', 'a', 'before'));
		expect(stepMoveOf(group, 'b', 'bottom')).toEqual(move('b', 'd', 'after'));
	});

	it('is null when the task is already there, or not in the group', () => {
		expect(stepMoveOf(group, 'a', 'up')).toBeNull();
		expect(stepMoveOf(group, 'a', 'top')).toBeNull();
		expect(stepMoveOf(group, 'd', 'down')).toBeNull();
		expect(stepMoveOf(group, 'd', 'bottom')).toBeNull();
		expect(stepMoveOf(group, 'z', 'up')).toBeNull();
	});
});

describe('the list in a manual order', () => {
	const lookups = { statuses: [], projectNames: new Map(), memberNames: new Map() };
	const manual = { ...DEFAULT_TEAM_TASKS_VIEW, ordering: 'manual' as const, grouping: 'issueType' as const };
	const tasks = [
		task('bug-old', '2026-01-01', { issueType: 'Bug' }),
		task('task-old', '2026-01-02', { issueType: 'Task' }),
		task('bug-new', '2026-01-03', { issueType: 'Bug' }),
		task('task-new', '2026-01-04', { issueType: 'Task' })
	];

	it('follows the view order inside each group, whatever the direction', () => {
		const groups = buildTeamTasksGroups(
			tasks,
			{ ...manual, isDescending: true },
			lookups,
			[],
			['bug-old', 'task-old']
		);
		const byType = Object.fromEntries(groups.map((group) => [group.value, idsOf(group.tasks)]));
		expect(byType).toEqual({ Task: ['task-old', 'task-new'], Bug: ['bug-old', 'bug-new'] });
		expect(idsOf(sortTeamTasks(tasks, 'manual', true, ['task-new']))).toEqual([
			'task-new',
			'bug-new',
			'task-old',
			'bug-old'
		]);
	});

	it("names the tasks of a row's group, for the menu's moves", () => {
		const groups = buildTeamTasksGroups(tasks, manual, lookups, [], []);
		const rows = flattenTeamTasksGroups(groups, new Set(), true);
		expect(groupTaskIdsOf(rows, 'bug-old')).toEqual(['bug-new', 'bug-old']);
		expect(groupTaskIdsOf(rows, 'missing')).toEqual([]);
	});

	it("is a saved view's ordering only: the device's stored view never reads it", () => {
		expect(viewSettingsFromStorage({ ordering: 'manual' }).ordering).toBe(DEFAULT_TEAM_TASKS_VIEW.ordering);
		expect(viewSettingsFromStorage({ ordering: 'manual' }, SAVED_VIEW_ORDERINGS).ordering).toBe('manual');
		expect(definitionOf({ displayOptions: { ordering: 'manual' } }).settings.ordering).toBe('manual');
	});
});
