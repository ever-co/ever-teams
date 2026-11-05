/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';

const mockGetLastTimerLogsOf = jest.fn();

jest.mock('@/core/services/client/api/timers', () => ({
	timerService: { getLastTimerLogsOf: (...args: unknown[]) => mockGetLastTimerLogsOf(...args) }
}));

import { useTodaySecondsWithoutTeam } from './use-today-seconds-without-team';

const tracking = { isOnline: true, isTrackingTime: true };

const member = (employeeId: string, employee: Record<string, unknown>, timerStatus: string) => ({
	id: `member-${employeeId}`,
	employeeId,
	employee,
	timerStatus
});

const runningSince = (employeeId: string, minutesAgo: number, organizationTeamId: string | null) => ({
	running: true,
	lastLog: {
		employeeId,
		organizationTeamId,
		startedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString()
	}
});

/** Today's seconds without a team of employee-a and employee-b. */
function renderFor(members: ReturnType<typeof member>[]) {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members }] as never);
	store.set(activeTeamIdState, 'team-a');
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const useBothMembers = () => [useTodaySecondsWithoutTeam('employee-a'), useTodaySecondsWithoutTeam('employee-b')];
	return renderHook(useBothMembers, { wrapper });
}

describe('useTodaySecondsWithoutTeam', () => {
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date(2026, 10, 5, 12, 0, 0), doNotFake: ['setTimeout', 'setInterval'] });
		mockGetLastTimerLogsOf.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('counts the running log with no team of a member tracking outside the team', async () => {
		mockGetLastTimerLogsOf.mockResolvedValue({
			data: [runningSince('employee-b', 30, 'team-z'), runningSince('employee-a', 90, null)]
		});
		const members = [member('employee-a', tracking, 'pause'), member('employee-b', tracking, 'idle')];

		const { result } = renderFor(members);

		await waitFor(() => expect(result.current).toEqual([90 * 60, 0]));
		expect(mockGetLastTimerLogsOf).toHaveBeenCalledWith(['employee-a', 'employee-b']);
	});

	it('reads nothing when no member tracks outside the team', () => {
		const { result } = renderFor([member('employee-a', tracking, 'running')]);

		expect(result.current).toEqual([0, 0]);
		expect(mockGetLastTimerLogsOf).not.toHaveBeenCalled();
	});

	it('counts nothing for a member whose timer runs in this team, even when the answer holds their log', async () => {
		mockGetLastTimerLogsOf.mockResolvedValue({
			data: [runningSince('employee-a', 90, null), runningSince('employee-b', 30, null)]
		});
		const members = [member('employee-a', tracking, 'running'), member('employee-b', tracking, 'pause')];

		const { result } = renderFor(members);

		await waitFor(() => expect(result.current).toEqual([0, 30 * 60]));
	});
});
