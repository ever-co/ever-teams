/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';

const mockUpdateTask = jest.fn();
const mockSetAllTasks = jest.fn();
const mockSetDetailedTask = jest.fn();
const mockSetActive = jest.fn();
const mockInvalidateTeamTasksData = jest.fn();
const mockGetTaskById = jest.fn();
let mockActiveTeam = {
	id: 'team-1',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	projects: [{ id: 'project-1' }]
};

jest.mock('@/core/services/client/api', () => ({
	taskService: {
		updateTask: (...args: unknown[]) => mockUpdateTask(...args)
	}
}));

jest.mock('@/core/stores', () => ({
	activeTeamState: 'active-team',
	activeTeamTaskId: 'active-team-task-id',
	detailedTaskState: 'detailed-task',
	teamTasksState: 'team-tasks'
}));

jest.mock('jotai', () => ({
	useAtomValue: () => mockActiveTeam,
	useSetAtom: (atom: string) => (atom === 'team-tasks' ? mockSetAllTasks : mockSetActive),
	useAtom: () => [null, mockSetDetailedTask]
}));

jest.mock('@/core/hooks/organizations/teams/use-invalidate-team-tasks', () => ({
	useInvalidateTeamTasks: () => ({ invalidateTeamTasksData: mockInvalidateTeamTasksData })
}));

jest.mock('@/core/hooks/organizations/teams/use-task-queries', () => ({
	useTaskQueries: () => ({ getTaskById: mockGetTaskById })
}));

jest.mock('@/core/lib/helpers/index', () => ({
	getActiveTaskIdCookie: jest.fn(),
	getActiveUserTaskCookie: jest.fn(),
	setActiveTaskIdCookie: jest.fn(),
	setActiveUserTaskCookie: jest.fn()
}));

import { useUpdateTask } from './use-update-task';

const originalTask = { id: 'task-1', title: 'Before' } as TTask;
const legacyKey = queryKeys.tasks.byTeam(mockActiveTeam.id);
const scopedKey = queryKeys.tasks.byTeamByScope(
	mockActiveTeam.tenantId,
	mockActiveTeam.organizationId,
	mockActiveTeam.id,
	mockActiveTeam.projects[0].id
);

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity },
			mutations: { retry: false }
		}
	});
}

function createWrapper(client: QueryClient) {
	return function Wrapper({ children }: React.PropsWithChildren) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

function list(title: string): PaginationResponse<TTask> {
	return { items: [{ ...originalTask, title }], total: 1 };
}

async function expectOptimisticUpdateAndRollback(
	client: QueryClient,
	queryKey: readonly unknown[],
	otherQueryKey?: readonly unknown[]
) {
	let rejectUpdate!: (reason: Error) => void;
	mockUpdateTask.mockImplementation(
		() =>
			new Promise((_resolve, reject) => {
				rejectUpdate = reject;
			})
	);
	const { result } = renderHook(() => useUpdateTask(), { wrapper: createWrapper(client) });
	const updatePromise = result.current.updateTask({ ...originalTask, title: 'After' });
	const settled = updatePromise.catch((error) => error);

	await waitFor(() => expect(client.getQueryData<PaginationResponse<TTask>>(queryKey)?.items[0].title).toBe('After'));
	if (otherQueryKey) {
		expect(client.getQueryData<PaginationResponse<TTask>>(otherQueryKey)?.items[0].title).toBe('Other cache');
	}

	const failure = new Error('update failed');
	await act(async () => {
		rejectUpdate(failure);
		expect(await settled).toBe(failure);
	});
	await waitFor(() =>
		expect(client.getQueryData<PaginationResponse<TTask>>(queryKey)?.items[0].title).toBe('Before')
	);
}

describe('useUpdateTask authoritative task cache', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockActiveTeam = {
			id: 'team-1',
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			projects: [{ id: 'project-1' }]
		};
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('optimistically updates and rolls back only the active scoped cache', async () => {
		const client = createQueryClient();
		client.setQueryData(scopedKey, list('Before'));
		client.setQueryData(legacyKey, list('Other cache'));

		await expectOptimisticUpdateAndRollback(client, scopedKey, legacyKey);
	});

	it('rolls back the captured cache without overwriting mirrors after the active scope changes', async () => {
		const client = createQueryClient();
		client.setQueryData(scopedKey, list('Before'));
		let rejectUpdate!: (reason: Error) => void;
		mockUpdateTask.mockImplementation(
			() =>
				new Promise((_resolve, reject) => {
					rejectUpdate = reject;
				})
		);
		const { result, rerender } = renderHook(() => useUpdateTask(), { wrapper: createWrapper(client) });
		const updatePromise = result.current.updateTask({ ...originalTask, title: 'After' }).catch((error) => error);
		await waitFor(() =>
			expect(client.getQueryData<PaginationResponse<TTask>>(scopedKey)?.items[0].title).toBe('After')
		);

		mockActiveTeam = {
			id: 'team-2',
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			projects: [{ id: 'project-2' }]
		};
		const nextKey = queryKeys.tasks.byTeamByScope('tenant-1', 'organization-1', 'team-2', 'project-2');
		client.setQueryData(nextKey, list('Current scope'));
		rerender();
		mockSetAllTasks.mockClear();

		await act(async () => {
			rejectUpdate(new Error('update failed'));
			await updatePromise;
		});

		expect(client.getQueryData<PaginationResponse<TTask>>(scopedKey)?.items[0].title).toBe('Before');
		expect(client.getQueryData<PaginationResponse<TTask>>(nextKey)?.items[0].title).toBe('Current scope');
		expect(mockSetAllTasks).not.toHaveBeenCalled();
	});
});
