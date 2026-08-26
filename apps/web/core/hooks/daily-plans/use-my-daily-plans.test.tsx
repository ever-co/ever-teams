/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState, teamTasksState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';

jest.mock('@/core/lib/helpers/cookies', () => ({
	ACCESS_TOKEN_REFRESHED_EVENT: 'ever-teams:access-token-refreshed',
	getAccessTokenCookie: () => 'token-a'
}));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: {
			id: 'user-a',
			tenantId: 'tenant-a',
			employee: { id: 'employee-a', tenantId: 'tenant-a', organizationId: 'organization-a' }
		}
	})
}));
jest.mock('../../services/client/api', () => ({
	dailyPlanService: { getMyDailyPlans: jest.fn(async () => ({ items: [], total: 0 })) }
}));
jest.mock('./use-daily-plan-calculations', () => ({
	useDailyPlanCalculations: () => ({
		todayPlan: null,
		futurePlans: [],
		pastPlans: [],
		outstandingPlans: [],
		todayTasks: [],
		futureTasks: [],
		sortedPlans: []
	})
}));

import { useMyDailyPlans } from './use-my-daily-plans';
const mockGetMyDailyPlans = jest.mocked(
	(jest.requireMock('../../services/client/api') as any).dailyPlanService.getMyDailyPlans
);

describe('personal-plan ownership', () => {
	beforeEach(() => mockGetMyDailyPlans.mockClear());

	it('makes default consumers share the shell scoped query and request', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const store = createStore();
		store.set(organizationTeamsState, [
			{
				id: 'team-a',
				organizationId: 'organization-a',
				members: [],
				projects: []
			} as any
		]);
		store.set(activeTeamIdState, 'team-a');
		store.set(teamTasksState, []);
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>
				<Provider store={store}>{children}</Provider>
			</QueryClientProvider>
		);

		const shellScope = {
			tenantId: 'tenant-a',
			organizationId: 'organization-a',
			teamId: 'team-a',
			userId: 'user-a',
			accessToken: 'token-a'
		};
		const { result } = renderHook(
			() => [useMyDailyPlans({ scope: shellScope }), useMyDailyPlans(), useMyDailyPlans()],
			{ wrapper }
		);
		await waitFor(() => expect(mockGetMyDailyPlans).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(result.current.every((owner) => owner.isSuccess)).toBe(true));

		expect(mockGetMyDailyPlans).toHaveBeenCalledTimes(1);
		expect(client.getQueryData(queryKeys.dailyPlans.myPlans('team-a'))).toBeUndefined();
		expect(
			client.getQueryData(queryKeys.dailyPlans.myPlansByScope('tenant-a', 'organization-a', 'team-a', 'user-a'))
		).toEqual({ items: [], total: 0 });
		expect(mockGetMyDailyPlans).toHaveBeenCalledWith({
			scope: {
				tenantId: 'tenant-a',
				organizationId: 'organization-a',
				teamId: 'team-a',
				userId: 'user-a',
				accessToken: 'token-a'
			},
			signal: expect.any(AbortSignal)
		});
	});
});
