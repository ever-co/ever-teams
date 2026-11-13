/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

const mockBulkUpdate = jest.fn();
const mockUpdateTask = jest.fn();
let mockBulkAvailable = true;
let mockTasks: Array<Record<string, unknown>> = [];

jest.mock('@/core/hooks/task-views/use-bulk-task-update', () => ({
	useBulkTaskUpdate: () => ({ bulkUpdate: mockBulkUpdate, isBulkAvailable: mockBulkAvailable })
}));
jest.mock('@/core/hooks/task-views/built-in-view-task-cache', () => ({
	showTaskChangeInBuiltInViews: () => () => undefined
}));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: mockUpdateTask })
}));
jest.mock('./use-task-labels-query', () => ({ useTaskLabelsQuery: () => ({ taskLabels: [] }) }));
jest.mock('@/core/stores', () => ({ tasksByTeamState: 'team-tasks' }));
jest.mock('@/core/stores/tasks/task-views', () => ({ viewTasksState: 'view-tasks' }));
jest.mock('jotai', () => ({
	useStore: () => ({ get: (atom: string) => (atom === 'team-tasks' ? mockTasks : []) })
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
// The queue runs each change at once: the specs read what was sent.
jest.mock('@/core/lib/utils/task.utils', () => ({ taskUpdateQueue: { task: (run: () => unknown) => run() } }));
jest.mock('@/core/lib/utils/error-feedback', () => ({ errorReasonKeyOf: () => 'reason' }));

import { runInThisContext } from 'node:vm';
import { useTeamTaskUpdates } from './use-team-task-updates';
import { dayNumberOf } from '@/core/lib/utils/team-tasks-timeline';

/** UTC−4 all year (no daylight saving), and UTC+2 all year. */
const WEST = 'America/Caracas';
const EAST = 'Africa/Johannesburg';

/**
 * Runs `body` with the clock in `zone`, as a browser there would be. Jest hands each test file a copy of process.env,
 * where TZ changes nothing: the zone is set on the real process.
 */
async function inZone(zone: string, body: () => Promise<void>): Promise<void> {
	const host = runInThisContext('process') as NodeJS.Process;
	const previous = host.env.TZ;
	const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
	host.env.TZ = zone;
	try {
		await body();
	} finally {
		// Deleting TZ does not reset the clock's zone: set the one before first.
		host.env.TZ = previous ?? current;
		if (previous === undefined) delete host.env.TZ;
	}
}

const task = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, ...extra });

describe('the property changes of a selection (T10: project and due date)', () => {
	beforeEach(() => {
		mockBulkUpdate.mockReset().mockResolvedValue({ applied: 1, refused: 0, results: [], unappliedIds: [] });
		mockUpdateTask.mockReset().mockResolvedValue(undefined);
		mockBulkAvailable = true;
		mockTasks = [task('t1', { projectId: 'p1' }), task('t2'), task('t3', { projectId: 'p2' })];
	});

	it('moves a selection to a project in one bulk request, and out of any project with null', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setProject(['t1', 't2', 't3'], 'p9');
		expect(mockBulkUpdate).toHaveBeenCalledWith(['t1', 't2', 't3'], { projectId: 'p9' }, expect.any(String));
		result.current.setProject(['t1', 't3'], null);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't3'], { projectId: null }, expect.any(String));
		expect(mockUpdateTask).not.toHaveBeenCalled();
	});

	it('gives a selection one due date in one bulk request, as the day in date-only form, and removes it with null', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setDueDate(['t1', 't2'], new Date(2026, 10, 20));
		expect(mockBulkUpdate).toHaveBeenCalledWith(['t1', 't2'], { dueDate: '2026-11-20T00:00:00.000Z' }, expect.any(String));
		result.current.setDueDate(['t1', 't2'], null);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { dueDate: null }, expect.any(String));
	});

	it('sends the day picked as midnight UTC of it west and east of UTC, for a selection and for one task', async () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		for (const [zone, offset] of [
			[WEST, 240],
			[EAST, -120]
		] as const) {
			mockBulkUpdate.mockClear();
			mockUpdateTask.mockClear();
			await inZone(zone, async () => {
				expect(`${zone} ${new Date(2026, 10, 14).getTimezoneOffset()}`).toBe(`${zone} ${offset}`);
				// The pickers give the local midnight of the day picked.
				result.current.setDueDate(['t1', 't2'], new Date(2026, 10, 14));
				result.current.setDueDate('t3', new Date(2026, 10, 14));
				await Promise.resolve();
			});
			const [, bulkChanges] = mockBulkUpdate.mock.calls[0];
			expect(`${zone} ${bulkChanges.dueDate}`).toBe(`${zone} 2026-11-14T00:00:00.000Z`);
			const [single] = mockUpdateTask.mock.calls[0];
			expect(`${zone} ${JSON.parse(JSON.stringify(single)).dueDate}`).toBe(`${zone} 2026-11-14T00:00:00.000Z`);
		}
	});

	it('updates one task on its own, and leaves a task already in the project alone', async () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setProject(['t2'], 'p1');
		result.current.setProject(['t1'], 'p1');
		result.current.setDueDate('t3', new Date(2026, 10, 21));
		await Promise.resolve();
		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledTimes(2);
		// The tracked time follows the task to its project, as from the task's own project picker.
		expect(mockUpdateTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 't2', projectId: 'p1' }), { moveTimeLogs: true });
		const dueOnTheDay = expect.objectContaining({ id: 't3', dueDate: new Date(Date.UTC(2026, 10, 21)) });
		expect(mockUpdateTask).toHaveBeenNthCalledWith(2, dueOnTheDay, undefined);
	});

	it('updates each task on its own without the platform bulk update (the feature off)', () => {
		mockBulkAvailable = false;
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setProject(['t1', 't2'], 'p3');
		result.current.setDueDate(['t1', 't2'], null);
		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledTimes(4);
		expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't2', projectId: 'p3' }), { moveTimeLogs: true });
		expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', dueDate: null }), undefined);
	});
});

describe('a task moved to a day of the calendar', () => {
	const november = (date: number) => dayNumberOf(new Date(2026, 10, date));

	beforeEach(() => {
		mockBulkUpdate.mockReset();
		mockUpdateTask.mockReset().mockResolvedValue(undefined);
		mockTasks = [task('ranged', { startDate: '2026-11-10', dueDate: '2026-11-14' }), task('undated')];
	});

	it('falls due that day with its start moved as much, in one update of its own', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.moveToDay('ranged', november(17));
		result.current.moveToDay('undated', november(20));

		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledTimes(2);
		// The due date in the platform's date-only form (midnight UTC of the day); the start as its local midnight.
		const movedRange = expect.objectContaining({
			id: 'ranged',
			startDate: new Date(2026, 10, 13),
			dueDate: new Date(Date.UTC(2026, 10, 17))
		});
		expect(mockUpdateTask).toHaveBeenNthCalledWith(1, movedRange, undefined);
		const datedNow = expect.objectContaining({ id: 'undated', dueDate: new Date(Date.UTC(2026, 10, 20)) });
		expect(mockUpdateTask).toHaveBeenNthCalledWith(2, datedNow, undefined);
	});

	it('sends nothing when the task is already due that day', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.moveToDay('ranged', november(14));

		expect(mockUpdateTask).not.toHaveBeenCalled();
	});
});

describe('a status change to a selection, in one bulk request', () => {
	beforeEach(() => {
		mockBulkUpdate.mockReset().mockResolvedValue({ applied: 2, refused: 0, results: [], unappliedIds: [] });
		mockUpdateTask.mockReset().mockResolvedValue(undefined);
		mockBulkAvailable = true;
		mockTasks = [task('t1'), task('t2')];
	});

	it('names one of the platform’s statuses by its value, and any other status by its id alone', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setStatus(['t1', 't2'], { id: 's-done', name: 'done', value: 'done' } as never);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskStatusId: 's-done', status: 'done' }, expect.any(String));
		// A status renamed in the team keeps the platform's value.
		result.current.setStatus(['t1', 't2'], { id: 's-review', name: 'Ready to ship', value: 'ready-for-review' } as never);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskStatusId: 's-review', status: 'ready-for-review' }, expect.any(String));
		// A status the platform does not name (the team's own, or one only this app knows): the route would refuse the name.
		result.current.setStatus(['t1', 't2'], { id: 's-qa', name: 'QA', value: 'qa' } as never);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskStatusId: 's-qa' }, expect.any(String));
		result.current.setStatus(['t1', 't2'], { id: 's-todo', name: 'todo', value: 'todo' } as never);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskStatusId: 's-todo' }, expect.any(String));
		expect(mockUpdateTask).not.toHaveBeenCalled();
	});
});

describe('a priority or size change, to a selection or one task', () => {
	beforeEach(() => {
		mockBulkUpdate.mockReset().mockResolvedValue({ applied: 2, refused: 0, results: [], unappliedIds: [] });
		mockUpdateTask.mockReset().mockResolvedValue(undefined);
		mockBulkAvailable = true;
		mockTasks = [task('t1', { priority: 'low', taskPriorityId: 'p-low' }), task('t2', { size: 'small', taskSizeId: null })];
	});

	it('gives a selection one of the platform’s priorities by its id and value, and a team’s own by its id alone', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setPriority(['t1', 't2'], { value: 'high', id: 'p-high' });
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskPriorityId: 'p-high', priority: 'high' }, expect.any(String));
		// The route would refuse `p0`: the platform names the task's priority from the record.
		result.current.setPriority(['t1', 't2'], { value: 'p0', id: 'p-0' });
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskPriorityId: 'p-0' }, expect.any(String));
		expect(mockUpdateTask).not.toHaveBeenCalled();
	});

	it('gives a selection a size the same way', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setSize(['t1', 't2'], { value: 'x-large', id: 'z-xl' });
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskSizeId: 'z-xl', size: 'x-large' }, expect.any(String));
		result.current.setSize(['t1', 't2'], { value: 'huge', id: 'z-huge' });
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { taskSizeId: 'z-huge' }, expect.any(String));
	});

	it('updates each task on its own when a team’s own value has no id to send it by', async () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setPriority(['t1', 't2'], { value: 'p0' });
		await Promise.resolve();
		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', priority: 'p0', taskPriorityId: null }), undefined);
	});

	it('saves one task’s priority and size with their records, and leaves a task that has them alone', async () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setPriority(['t1'], { value: 'p0', id: 'p-0' });
		result.current.setSize(['t2'], { value: 'huge', id: 'z-huge' });
		result.current.setPriority(['t1'], { value: 'low', id: 'p-low' });
		await Promise.resolve();
		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledTimes(2);
		expect(mockUpdateTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 't1', priority: 'p0', taskPriorityId: 'p-0' }), undefined);
		expect(mockUpdateTask).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 't2', size: 'huge', taskSizeId: 'z-huge' }), undefined);
	});
});
