/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/core/query/keys';
import type { TTaskStatus } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const mockUpdateTask = jest.fn();
let mockTeamTasks: TTask[] = [];
let mockViewTasks: TTask[] = [];
let mockQueueTail: Promise<unknown> = Promise.resolve();

function mockTasksOf(atom: string) {
	if (atom === 'team-tasks') {
		return mockTeamTasks;
	}
	return mockViewTasks;
}

function mockSetTasks(atom: string, tasks: TTask[]) {
	if (atom === 'view-tasks') {
		mockViewTasks = tasks;
	}
}

function mockRunInTurn(run: () => Promise<void>) {
	mockQueueTail = mockQueueTail.then(run);
}

jest.mock('@/core/hooks/task-views/use-bulk-task-update', () => ({
	useBulkTaskUpdate: () => ({ bulkUpdate: jest.fn(), isBulkAvailable: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: mockUpdateTask })
}));
jest.mock('./use-task-labels-query', () => ({ useTaskLabelsQuery: () => ({ taskLabels: [] }) }));
jest.mock('@/core/stores', () => ({ tasksByTeamState: 'team-tasks' }));
jest.mock('@/core/stores/tasks/task-views', () => ({ viewTasksState: 'view-tasks' }));
jest.mock('jotai', () => ({ useStore: () => ({ get: mockTasksOf, set: mockSetTasks }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
// The changes run one after the other, as in the update queue, without its start delay.
jest.mock('@/core/lib/utils/task.utils', () => ({ taskUpdateQueue: { task: mockRunInTurn } }));
jest.mock('@/core/lib/utils/error-feedback', () => ({ errorReasonKeyOf: () => 'reason' }));

import { useTeamTaskUpdates } from './use-team-task-updates';

const mineKey = queryKeys.taskViews.builtIn('tenant-1', 'organization-1', 'user-1', 'mine');
const todo = { id: 's1', name: 'todo' } as TTaskStatus;
const done = { id: 's2', name: 'done' } as TTaskStatus;

const task = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: id, ...extra }) as unknown as TTask;

function renderUpdates(queryClient: QueryClient) {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useTeamTaskUpdates(), { wrapper });
}

function tasksInView(queryClient: QueryClient) {
	const view = queryClient.getQueryData<{ items: TTask[] }>(mineKey);
	return view?.items ?? [];
}

function listedTask(queryClient: QueryClient, taskId: string) {
	const tasks = tasksInView(queryClient);
	return tasks.find((item) => item.id === taskId);
}

function openViewTask(taskId: string) {
	return mockViewTasks.find((item) => item.id === taskId);
}

/** A save the spec answers or refuses itself. */
function pendingSave() {
	let resolveSave: () => void = () => undefined;
	let rejectSave: (error: Error) => void = () => undefined;
	const promise = new Promise<void>((resolve, reject) => {
		resolveSave = resolve;
		rejectSave = reject;
	});
	return { promise, answer: () => resolveSave(), refuse: (error: Error) => rejectSave(error) };
}

/** Every queued change has run, its save answered. */
async function queuedChangesSettled() {
	await act(async () => {
		await mockQueueTail;
	});
}

describe('a change made from Team tasks on a built-in view', () => {
	const otherTeamTask = task('a', {
		status: 'todo',
		taskStatusId: 's1',
		priority: 'low',
		startDate: '2026-11-10',
		dueDate: '2026-11-14'
	});
	const teamTask = task('b', { status: 'todo', taskStatusId: 's1' });
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		queryClient.setQueryData(mineKey, { items: [otherTeamTask, teamTask], total: 2 });
		mockTeamTasks = [teamTask];
		mockViewTasks = [otherTeamTask, teamTask];
		mockQueueTail = Promise.resolve();
		mockUpdateTask.mockReset();
	});

	it("shows in the view while the save is still out, on another team's task and on the team's own", async () => {
		const firstSave = pendingSave();
		mockUpdateTask.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(pendingSave().promise);
		const { result } = renderUpdates(queryClient);

		act(() => result.current.setStatus(['a'], done));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(1));
		expect(listedTask(queryClient, 'a')).toMatchObject({ status: 'done', taskStatusId: 's2', priority: 'low' });
		expect(openViewTask('a')).toMatchObject({ status: 'done', taskStatusId: 's2' });

		await act(async () => firstSave.answer());
		act(() => result.current.setStatus(['b'], done));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(2));
		expect(listedTask(queryClient, 'b')).toMatchObject({ status: 'done', taskStatusId: 's2' });
		expect(listedTask(queryClient, 'a')).toMatchObject({ status: 'done', taskStatusId: 's2' });
	});

	it('moves a bar dragged on the timeline to its new days in the view at once', async () => {
		mockUpdateTask.mockReturnValue(pendingSave().promise);
		const { result } = renderUpdates(queryClient);

		act(() => result.current.moveDates('a', 'move', 3));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(1));

		const moved = { startDate: new Date(2026, 10, 13), dueDate: new Date(2026, 10, 17) };
		expect(listedTask(queryClient, 'a')).toMatchObject(moved);
	});

	it('puts the task back as the view listed it when the save fails, and says why', async () => {
		const save = pendingSave();
		mockUpdateTask.mockReturnValue(save.promise);
		const { result } = renderUpdates(queryClient);

		act(() => result.current.setPriority(['a'], 'high'));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(1));
		expect(listedTask(queryClient, 'a')).toMatchObject({ priority: 'high' });
		save.refuse(new Error('refused'));
		await queuedChangesSettled();

		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(listedTask(queryClient, 'a')).toEqual(otherTeamTask);
		expect(listedTask(queryClient, 'b')).toEqual(teamTask);
		expect(openViewTask('a')).toEqual(otherTeamTask);
	});

	it('starts a change queued behind a failed one from the task as it was, without the refused value', async () => {
		const firstSave = pendingSave();
		mockUpdateTask.mockReturnValueOnce(firstSave.promise).mockResolvedValueOnce(undefined);
		const { result } = renderUpdates(queryClient);

		act(() => result.current.setStatus(['a'], done));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(1));
		// The page copies the cached view into the open view's tasks once it renders, as it does between two changes.
		mockViewTasks = tasksInView(queryClient);
		act(() => result.current.setPriority(['a'], 'high'));
		firstSave.refuse(new Error('refused'));
		await queuedChangesSettled();

		expect(mockUpdateTask).toHaveBeenCalledTimes(2);
		const queuedChange = expect.objectContaining({ id: 'a', status: 'todo', taskStatusId: 's1', priority: 'high' });
		expect(mockUpdateTask).toHaveBeenLastCalledWith(queuedChange, undefined);
	});

	it('leaves the view as it is when nothing changes', async () => {
		const viewBefore = queryClient.getQueryData(mineKey);
		const openViewBefore = mockViewTasks;
		const { result } = renderUpdates(queryClient);

		act(() => result.current.setStatus(['a'], todo));
		await queuedChangesSettled();

		expect(mockUpdateTask).not.toHaveBeenCalled();
		expect(queryClient.getQueryData(mineKey)).toBe(viewBefore);
		expect(mockViewTasks).toBe(openViewBefore);
	});
});
