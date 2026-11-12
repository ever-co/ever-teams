/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamTaskState, leftActiveTaskIdState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

jest.mock('@/core/lib/helpers/index', () => ({
	...jest.requireActual('@/core/lib/helpers/index'),
	setActiveTaskIdCookie: jest.fn()
}));
jest.mock('@/core/services/client/api', () => ({ taskService: {} }));
jest.mock('./use-invalidate-team-tasks', () => ({
	useInvalidateTeamTasks: () => ({ invalidateTeamTasksData: jest.fn() })
}));

import { useDeleteTask } from './use-delete-task';

/**
 * #5119: the timer stops only when the person switches to another task or leaves the active one on purpose, never when
 * the app empties the active task by itself. Leaving one's active task marks it as left for the timer.
 */
describe('useDeleteTask.unassignAuthActiveTask', () => {
	it('empties the active task and marks it as left, so a timer running on it stops', () => {
		const store = createStore();
		store.set(activeTeamTaskState, { id: 'task-a' } as unknown as TTask);
		const queryClient = new QueryClient();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const { result } = renderHook(() => useDeleteTask(), { wrapper });

		act(() => result.current.unassignAuthActiveTask());

		expect(store.get(activeTeamTaskState)).toBeNull();
		expect(store.get(leftActiveTaskIdState)).toBe('task-a');
	});
});
