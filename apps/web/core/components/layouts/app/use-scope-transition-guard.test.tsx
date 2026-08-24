/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import {
	activeTaskStatisticsState,
	activeTeamTaskState,
	localTimerStatusState,
	organizationTeamsState,
	tasksStatisticsState,
	teamTasksState,
	timeCounterState,
	timerSecondsState,
	timerStatusState
} from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { useScopeTransitionGuard, type FastShellScope } from './use-scope-transition-guard';

const team = (id: string) => ({ id, name: id }) as any;

describe('useScopeTransitionGuard', () => {
	it('cancels only exact old critical keys, rejects the old generation, and clears incompatible mirrors', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		store.set(organizationTeamsState, [team('team-1')]);
		store.set(teamTasksState, [{ id: 'task-1', title: 'Old' } as any]);
		store.set(activeTeamTaskState, { id: 'task-1', title: 'Old' } as any);
		store.set(timerStatusState, { running: true } as any);
		store.set(localTimerStatusState, { running: true, runnedDateTime: 1, lastTaskId: 'task-1' });
		store.set(timeCounterState, 10);
		store.set(timerSecondsState, 10);
		store.set(tasksStatisticsState, { all: [{} as any], today: [{} as any] });
		store.set(activeTaskStatisticsState, { total: {} as any, today: {} as any });

		const oldKey = queryKeys.tasks.byTeamByScope('tenant-1', 'org-1', 'team-1', 'project-1');
		const unrelatedKey = ['unrelated', 'keep-me'] as const;
		let oldAborted = false;
		void queryClient
			.fetchQuery({
				queryKey: oldKey,
				queryFn: ({ signal }) =>
					new Promise(() => signal.addEventListener('abort', () => (oldAborted = true), { once: true }))
			})
			.catch(() => undefined);
		void queryClient.fetchQuery({ queryKey: unrelatedKey, queryFn: () => new Promise(() => undefined) });

		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const scope1: FastShellScope = {
			tenantId: 'tenant-1',
			organizationId: 'org-1',
			teamId: 'team-1',
			projectId: 'project-1',
			userId: 'user-1',
			employeeId: 'employee-1',
			taskId: 'task-1'
		};
		const { result, rerender } = renderHook(
			({ scope }: { scope: FastShellScope }) => useScopeTransitionGuard(scope, true),
			{
				wrapper,
				initialProps: { scope: scope1 }
			}
		);
		const oldGeneration = result.current.isCurrentGeneration;

		rerender({ scope: { ...scope1, teamId: 'team-2', projectId: 'project-2', taskId: null } });
		await waitFor(() => expect(oldAborted).toBe(true));
		expect(oldGeneration()).toBe(false);
		expect(result.current.isCurrentGeneration()).toBe(true);
		expect(queryClient.getQueryState(unrelatedKey)?.fetchStatus).toBe('fetching');
		expect(store.get(organizationTeamsState)).toHaveLength(1);
		expect(store.get(teamTasksState)).toEqual([]);
		expect(store.get(activeTeamTaskState)).toBeNull();
		expect(store.get(timerStatusState)).toBeNull();
		expect(store.get(localTimerStatusState)).toBeNull();
		expect(store.get(timeCounterState)).toBe(0);
		expect(store.get(timerSecondsState)).toBe(0);
		expect(store.get(tasksStatisticsState)).toEqual({ all: [], today: [] });
		expect(store.get(activeTaskStatisticsState)).toEqual({ total: null, today: null });

		rerender({
			scope: {
				...scope1,
				organizationId: 'org-2',
				teamId: 'team-3',
				projectId: null,
				taskId: null
			}
		});
		await waitFor(() => expect(store.get(organizationTeamsState)).toEqual([]));
	});
});
