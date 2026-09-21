/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore, useSetAtom } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import { useEffect, type PropsWithChildren } from 'react';

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
import { useScopeTransitionGuard, type ShellScope } from './use-scope-transition-guard';

const team = (id: string) => ({ id, name: id }) as any;

describe('useScopeTransitionGuard', () => {
	it('clears the previous scope before cached current-scope mirrors hydrate', () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const scopeA: ShellScope = {
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			teamId: 'team-a',
			projectId: 'project-a',
			userId: 'user-a',
			employeeId: 'employee-a',
			taskId: 'task-a'
		};
		const scopeB: ShellScope = {
			tenantId: 'tenant-b',
			organizationId: 'organization-b',
			teamId: 'team-b',
			projectId: 'project-b',
			userId: 'user-b',
			employeeId: 'employee-b',
			taskId: 'task-b'
		};

		const { rerender } = renderHook(
			({ scope }: { scope: ShellScope }) => {
				const setTeams = useSetAtom(organizationTeamsState);
				const setTasks = useSetAtom(teamTasksState);
				const setActiveTask = useSetAtom(activeTeamTaskState);
				const setTimerStatus = useSetAtom(timerStatusState);
				const setStatistics = useSetAtom(activeTaskStatisticsState);

				// The shell's query-owner hydration effects are registered before its
				// transition guard and can synchronously expose fresh cached data.
				useEffect(() => {
					setTeams([team(scope.teamId!)]);
					setTasks([{ id: scope.taskId, title: scope.taskId } as any]);
					setActiveTask({ id: scope.taskId, title: scope.taskId } as any);
					setTimerStatus({ running: false, source: scope.teamId } as any);
					setStatistics({
						total: { id: `total-${scope.taskId}` } as any,
						today: { id: `today-${scope.taskId}` } as any
					});
				}, [scope, setActiveTask, setStatistics, setTasks, setTeams, setTimerStatus]);

				useScopeTransitionGuard(scope, true);
			},
			{ wrapper, initialProps: { scope: scopeA } }
		);

		rerender({ scope: scopeB });

		expect(store.get(organizationTeamsState).map(({ id }) => id)).toEqual(['team-b']);
		expect(store.get(teamTasksState).map(({ id }) => id)).toEqual(['task-b']);
		expect(store.get(activeTeamTaskState)?.id).toBe('task-b');
		expect((store.get(timerStatusState) as any)?.source).toBe('team-b');
		expect((store.get(activeTaskStatisticsState).today as any)?.id).toBe('today-task-b');
	});

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
		const scope1: ShellScope = {
			tenantId: 'tenant-1',
			organizationId: 'org-1',
			teamId: 'team-1',
			projectId: 'project-1',
			userId: 'user-1',
			employeeId: 'employee-1',
			taskId: 'task-1'
		};
		const { result, rerender } = renderHook(
			({ scope }: { scope: ShellScope }) => useScopeTransitionGuard(scope, true),
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

	it('clears task mirrors on project changes and timer mirrors on user changes within one team', () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);
		const scope: ShellScope = {
			tenantId: 'tenant-1',
			organizationId: 'org-1',
			teamId: 'team-1',
			projectId: 'project-1',
			userId: 'user-1',
			employeeId: 'employee-1',
			taskId: 'task-1'
		};
		const { rerender } = renderHook(
			({ current }: { current: ShellScope }) => useScopeTransitionGuard(current, true),
			{ wrapper, initialProps: { current: scope } }
		);

		store.set(teamTasksState, [{ id: 'task-1' } as any]);
		store.set(activeTeamTaskState, { id: 'task-1' } as any);
		store.set(timerStatusState, { running: true } as any);
		rerender({ current: { ...scope, projectId: 'project-2' } });
		expect(store.get(teamTasksState)).toEqual([]);
		expect(store.get(activeTeamTaskState)).toBeNull();
		expect(store.get(timerStatusState)).toEqual({ running: true });

		store.set(timerStatusState, { running: true } as any);
		store.set(localTimerStatusState, { running: true, runnedDateTime: 1, lastTaskId: 'task-1' });
		store.set(timeCounterState, 15);
		store.set(timerSecondsState, 15);
		rerender({ current: { ...scope, projectId: 'project-2', userId: 'user-2', employeeId: 'employee-2' } });
		expect(store.get(timerStatusState)).toBeNull();
		expect(store.get(localTimerStatusState)).toBeNull();
		expect(store.get(timeCounterState)).toBe(0);
		expect(store.get(timerSecondsState)).toBe(0);
	});
});
