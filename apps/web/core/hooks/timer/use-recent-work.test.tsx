/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { teamTasksState } from '@/core/stores';

const mockGetTimeLogs = jest.fn();
let mockUser: Record<string, unknown> | undefined;

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

import { useRecentWork } from './use-recent-work';

const TEAM_TASKS = [
	{ id: 'task-1', title: 'Write the diary', status: 'in-progress' },
	{ id: 'task-2', title: 'Fix the login', status: 'todo' }
];

function logOf(id: string, taskId: string, day: number) {
	return {
		id,
		taskId,
		employeeId: 'employee-1',
		startedAt: new Date(2026, 10, day, 9),
		project: { name: 'Website' }
	};
}

function renderRecentWork() {
	const store = createStore();
	store.set(teamTasksState, TEAM_TASKS as never);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useRecentWork(), { wrapper });
}

beforeEach(() => {
	jest.useFakeTimers({
		now: new Date(2026, 10, 12, 15, 37),
		doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'clearTimeout', 'setInterval']
	});
	mockUser = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'organization-1' } };
});

afterEach(() => {
	jest.useRealTimers();
	jest.clearAllMocks();
});

describe('useRecentWork', () => {
	it("reads the member's own entries of the last two weeks in one request", async () => {
		mockGetTimeLogs.mockResolvedValue([]);
		const { result } = renderRecentWork();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(mockGetTimeLogs).toHaveBeenCalledTimes(1);
		expect(mockGetTimeLogs).toHaveBeenCalledWith(
			expect.objectContaining({ startDate: '2026-10-30', endDate: '2026-11-12', employeeIds: ['employee-1'] })
		);
		expect(result.current.recentTasks).toEqual([]);
	});

	it('lists the tasks tracked last that the team still lists', async () => {
		mockGetTimeLogs.mockResolvedValue([
			logOf('log-1', 'task-1', 9),
			logOf('log-2', 'task-removed', 10),
			logOf('log-3', 'task-2', 11),
			logOf('log-4', 'task-1', 12)
		]);
		const { result } = renderRecentWork();

		await waitFor(() => expect(result.current.recentTasks).toHaveLength(2));

		expect(result.current.recentTasks.map((recent) => recent.task.id)).toEqual(['task-1', 'task-2']);
		expect(result.current.recentTasks[0].projectName).toBe('Website');
	});

	it('says the entries could not be read, and reads them again on request', async () => {
		mockGetTimeLogs.mockRejectedValueOnce(new Error('offline'));
		mockGetTimeLogs.mockResolvedValue([logOf('log-1', 'task-1', 12)]);
		const { result } = renderRecentWork();

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.recentTasks).toEqual([]);

		void result.current.retry();

		await waitFor(() => expect(result.current.recentTasks).toHaveLength(1));
		expect(result.current.isError).toBe(false);
	});

	it('reads nothing for a user who is not an employee', () => {
		mockUser = { id: 'user-1', tenantId: 'tenant-1' };
		const { result } = renderRecentWork();

		expect(result.current.isLoading).toBe(false);
		expect(result.current.recentTasks).toEqual([]);
		expect(mockGetTimeLogs).not.toHaveBeenCalled();
	});
});
