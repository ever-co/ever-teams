/**
 * @jest-environment jsdom
 *
 * The team dashboard's heatmap and day timeline come from one read of the team's logs. Another period or member
 * filter used to start that read from nothing, so both went back to their skeletons; the previous logs of the same
 * workspace now stay, with their own period, until the next ones come (#5353).
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Period } from '@/core/lib/utils/dashboard-period';
import { useTeamPeriodLogs } from './use-team-period-logs';

const mockGetTimeLogs = jest.fn();
let mockOrganizationId = 'organization-1';

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => mockOrganizationId
}));

const thisWeek: Period = { from: new Date(2026, 10, 9), to: new Date(2026, 10, 15, 23, 59, 59) };
const lastWeek: Period = { from: new Date(2026, 10, 2), to: new Date(2026, 10, 8, 23, 59, 59) };
const adaLog = {
	id: 'log-ada',
	employeeId: 'ada',
	startedAt: '2026-11-10T09:00:00Z',
	stoppedAt: '2026-11-10T10:00:00Z'
};
const bobLog = {
	id: 'log-bob',
	employeeId: 'bob',
	startedAt: '2026-11-10T11:00:00Z',
	stoppedAt: '2026-11-10T12:00:00Z'
};

type Props = { period: Period; employeeIds: string[] };

function renderTeamLogs(initialProps: Props = { period: thisWeek, employeeIds: ['ada', 'bob'] }) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(({ period, employeeIds }: Props) => useTeamPeriodLogs({ period, employeeIds, isEnabled: true }), {
		wrapper,
		initialProps
	});
}

describe('useTeamPeriodLogs', () => {
	beforeEach(() => {
		mockOrganizationId = 'organization-1';
		mockGetTimeLogs.mockReset();
		mockGetTimeLogs.mockResolvedValueOnce([adaLog, bobLog]);
		// The next read stays on its way, as on a slow network
		mockGetTimeLogs.mockReturnValue(new Promise(() => undefined));
	});

	it('keeps the logs and their own period while another period is read', async () => {
		const { result, rerender } = renderTeamLogs();
		await waitFor(() => expect(result.current.logs).toHaveLength(2));

		rerender({ period: lastWeek, employeeIds: ['ada', 'bob'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.isLoading).toBe(false);
		expect(result.current.logs).toHaveLength(2);
		expect(result.current.period).toBe(thisWeek);
	});

	it('drops the logs of a member the filter no longer picks while the new read is on its way', async () => {
		const { result, rerender } = renderTeamLogs();
		await waitFor(() => expect(result.current.logs).toHaveLength(2));

		rerender({ period: thisWeek, employeeIds: ['ada'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.isLoading).toBe(false);
		expect(result.current.logs.map((log) => log.id)).toEqual(['log-ada']);
	});

	it('gives the period asked for when it shares its read with the previous one (both run through today)', async () => {
		const day = 24 * 60 * 60 * 1000;
		const now = new Date();
		const sameStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
		const endedEarlier: Period = { from: sameStart, to: new Date(now.getTime() - 3 * day) };
		const runsToToday: Period = { from: sameStart, to: now };
		const { result, rerender } = renderTeamLogs({ period: endedEarlier, employeeIds: ['ada', 'bob'] });
		await waitFor(() => expect(result.current.logs).toHaveLength(2));
		expect(result.current.period).toBe(endedEarlier);
		const readsBefore = mockGetTimeLogs.mock.calls.length;

		rerender({ period: runsToToday, employeeIds: ['ada', 'bob'] });

		expect(mockGetTimeLogs.mock.calls).toHaveLength(readsBefore);
		expect(result.current.period).toBe(runsToToday);
	});

	it('keeps the period last drawn, not the one that made the shared read, while another period is read', async () => {
		const day = 24 * 60 * 60 * 1000;
		const now = new Date();
		const sameStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
		const endedEarlier: Period = { from: sameStart, to: new Date(now.getTime() - 3 * day) };
		const runsToToday: Period = { from: sameStart, to: now };
		const weeksBefore: Period = {
			from: new Date(sameStart.getTime() - 14 * day),
			to: new Date(sameStart.getTime() - 8 * day)
		};
		const { result, rerender } = renderTeamLogs({ period: endedEarlier, employeeIds: ['ada', 'bob'] });
		await waitFor(() => expect(result.current.logs).toHaveLength(2));
		rerender({ period: runsToToday, employeeIds: ['ada', 'bob'] });
		expect(result.current.period).toBe(runsToToday);

		rerender({ period: weeksBefore, employeeIds: ['ada', 'bob'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.logs).toHaveLength(2);
		expect(result.current.period).toBe(runsToToday);
	});

	it('CONTROL: another workspace starts from its loading state', async () => {
		const { result, rerender } = renderTeamLogs();
		await waitFor(() => expect(result.current.logs).toHaveLength(2));

		mockOrganizationId = 'organization-2';
		rerender({ period: thisWeek, employeeIds: ['ada', 'bob'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.isLoading).toBe(true);
		expect(result.current.logs).toEqual([]);
	});
});
