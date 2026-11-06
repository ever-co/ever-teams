/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockGetTimeLogReportDaily = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogReportDaily: (...args: unknown[]) => mockGetTimeLogReportDaily(...args) }
}));
jest.mock('@/core/services/client/api/timesheets/statistic.service', () => ({ statisticsService: {} }));

import { useTimeActivityDailyQuery, type TimeActivityRequest } from './use-time-activity-queries';

const request: TimeActivityRequest = {
	tenantId: 'tenant-a',
	organizationId: 'organization-a',
	startDate: '2026-11-01',
	endDate: '2026-11-02',
	timeZone: 'UTC',
	employeeIds: [],
	teamIds: ['team-a'],
	projectIds: [],
	taskIds: [],
	includeTimeWithoutTeam: true
};

describe('useTimeActivityDailyQuery', () => {
	it('passes on a request for the time without a team', async () => {
		mockGetTimeLogReportDaily.mockResolvedValue({ data: [] });
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);

		const { result } = renderHook(() => useTimeActivityDailyQuery(request), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockGetTimeLogReportDaily).toHaveBeenCalledWith(
			expect.objectContaining({ teamIds: ['team-a'], includeTimeWithoutTeam: true })
		);
	});
});
