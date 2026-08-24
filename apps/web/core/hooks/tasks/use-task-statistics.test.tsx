/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { activeTaskStatisticsState, activeTeamState, activeTeamTaskState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';

const user = {
	id: 'user-b',
	employee: { id: 'employee-b', tenantId: 'tenant-b', organizationId: 'organization-b' }
};
const isCurrentScope = () => true;

jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: user })
}));
jest.mock('../common/use-first-load', () => ({
	useFirstLoad: () => ({ firstLoad: false, firstLoadData: jest.fn() })
}));
jest.mock('../common', () => ({ useRefreshIntervalV2: jest.fn() }));
jest.mock('../bootstrap/use-fast-scope-guard', () => ({
	useFastScopeGuard: () => isCurrentScope
}));
jest.mock('@/core/services/client/api/timesheets/statistic.service', () => ({
	statisticsService: {
		activeTaskTimesheetStatistics: jest.fn(),
		tasksTimesheetStatistics: jest.fn(),
		allTaskTimesheetStatistics: jest.fn()
	}
}));

import { useTaskStatistics } from './use-task-statistics';

describe('useTaskStatistics scoped cache hydration', () => {
	it('keeps cached statistics for the current task after its transition clear', async () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } }
		});
		const store = createStore();
		const task = { id: 'task-b', title: 'Task B', estimate: 0 } as any;
		store.set(activeTeamState, { id: 'team-b', members: [] } as any);
		store.set(activeTeamTaskState, task);
		store.set(activeTaskStatisticsState, {
			total: { id: 'stale-total' } as any,
			today: { id: 'stale-today' } as any
		});
		const scope = {
			tenantId: 'tenant-b',
			organizationId: 'organization-b',
			teamId: 'team-b',
			userId: 'user-b',
			accessToken: 'token-b'
		};
		const key = queryKeys.tasks.statisticsByScope(
			scope.tenantId,
			scope.organizationId,
			scope.teamId,
			task.id,
			user.employee.id
		);
		queryClient.setQueryData(key, {
			data: {
				global: [{ id: 'current-total' }],
				today: [{ id: 'current-today' }]
			}
		});
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);

		renderHook(() => useTaskStatistics(0, { enabled: true, scope, refetchInterval: false }), { wrapper });

		await waitFor(() => {
			expect((store.get(activeTaskStatisticsState).total as any)?.id).toBe('current-total');
			expect((store.get(activeTaskStatisticsState).today as any)?.id).toBe('current-today');
		});
	});
});
