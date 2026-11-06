/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockGetTimeLogReportDaily = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogReportDaily: (...args: unknown[]) => mockGetTimeLogReportDaily(...args) }
}));
jest.mock('@/core/services/client/api/timesheets/statistic.service', () => ({ statisticsService: {} }));
jest.mock('@/core/hooks/activities/use-activity-filters', () => ({
	getActivityQueryKeyParams: (props: { teamIds?: string[] } | null) => ({ selectedTeamIds: props?.teamIds })
}));

import { useTeamDailyReportQuery } from './use-team-report-queries';

const props = {
	tenantId: 'tenant-a',
	organizationId: 'organization-a',
	startDate: '2026-11-01',
	endDate: '2026-11-02',
	teamIds: ['team-a'],
	employeeIds: ['employee-a']
};

describe('useTeamDailyReportQuery', () => {
	it("asks for the time the team's members logged without a team, under a key of its own", async () => {
		mockGetTimeLogReportDaily.mockResolvedValue({ data: [] });
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useTeamDailyReportQuery(props as never, true), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetTimeLogReportDaily).toHaveBeenCalledWith(
			expect.objectContaining({ teamIds: ['team-a'], includeTimeWithoutTeam: true })
		);
		const [query] = client.getQueryCache().getAll();
		expect(query.queryKey).toEqual([
			'activities',
			'daily-activity-report',
			expect.objectContaining({ includeTimeWithoutTeam: true })
		]);
	});
});
