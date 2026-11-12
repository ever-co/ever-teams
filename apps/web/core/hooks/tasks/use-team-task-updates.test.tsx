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

import { useTeamTaskUpdates } from './use-team-task-updates';

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

	it('gives a selection one due date in one bulk request, as an ISO day, and removes it with null', () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		const day = new Date(2026, 10, 20);
		result.current.setDueDate(['t1', 't2'], day);
		expect(mockBulkUpdate).toHaveBeenCalledWith(['t1', 't2'], { dueDate: day.toISOString() }, expect.any(String));
		result.current.setDueDate(['t1', 't2'], null);
		expect(mockBulkUpdate).toHaveBeenLastCalledWith(['t1', 't2'], { dueDate: null }, expect.any(String));
	});

	it('updates one task on its own, and leaves a task already in the project alone', async () => {
		const { result } = renderHook(() => useTeamTaskUpdates());
		result.current.setProject(['t2'], 'p1');
		result.current.setProject(['t1'], 'p1');
		const day = new Date(2026, 10, 21);
		result.current.setDueDate('t3', day);
		await Promise.resolve();
		expect(mockBulkUpdate).not.toHaveBeenCalled();
		expect(mockUpdateTask).toHaveBeenCalledTimes(2);
		// The tracked time follows the task to its project, as from the task's own project picker.
		expect(mockUpdateTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 't2', projectId: 'p1' }), { moveTimeLogs: true });
		expect(mockUpdateTask).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 't3', dueDate: day }), undefined);
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
