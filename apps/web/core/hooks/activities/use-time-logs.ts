import { useAtom } from 'jotai';
import { timerLogsDailyReportState } from '@/core/stores/timer/time-logs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { useFirstLoad } from '../common/use-first-load';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { useUserProfilePage } from '../users';
import { queryKeys } from '@/core/query/keys';

export function useTimeLogs() {
	const { user } = useAuthenticateUser();
	const profile = useUserProfilePage();

	const { firstLoadData: firstLoadTimeLogs, firstLoad } = useFirstLoad();

	const [timerLogsDailyReport, setTimerLogsDailyReport] = useAtom(timerLogsDailyReportState);

	// SECURE - Stable dates initialized once to prevent infinite re-renders
	const [currentDateRange, setCurrentDateRange] = useState<{
		startDate: Date;
		endDate: Date;
	}>(() => ({
		startDate: moment().startOf('year').toDate(),
		endDate: moment().endOf('day').toDate()
	}));

	// GOOD BEHAVIOR - Block execution if parameters are missing (avoids useless API calls)
	const baseParams = useMemo(() => {
		if (!user?.tenantId || !user?.employee?.organizationId || !profile.member?.employeeId) return null;
		return {
			tenantId: user.tenantId,
			organizationId: user.employee.organizationId,
			employeeIds: [profile.member.employeeId]
		};
	}, [user?.tenantId, user?.employee?.organizationId, profile.member?.employeeId]);

	// SECURE - Stable query key with memoization
	const queryKey = useMemo(
		() =>
			baseParams
				? queryKeys.timesheet.timerLogsDailyReport(
						baseParams.tenantId,
						baseParams.organizationId,
						baseParams.employeeIds,
						currentDateRange.startDate.toISOString(),
						currentDateRange.endDate.toISOString()
					)
				: ['timesheet', 'disabled'],
		[baseParams, currentDateRange.startDate, currentDateRange.endDate]
	);

	// Optimized React Query
	const timerLogsDailyReportQuery = useQuery({
		queryKey,
		queryFn: async () => {
			if (!baseParams) throw new Error('Timer logs daily report parameters are required');
			return await timeLogService.getTimerLogsDailyReport({
				...baseParams,
				startDate: currentDateRange.startDate,
				endDate: currentDateRange.endDate
			});
		},
		enabled: !!(baseParams && firstLoad), // GOOD BEHAVIOR - No call if parameters missing
		staleTime: 1000 * 60 * 10, // 10 minutes - reports change less frequently
		gcTime: 1000 * 60 * 30 // 30 minutes in cache
	});

	// Jotai synchronization
	useEffect(() => {
		if (timerLogsDailyReportQuery.data && Array.isArray(timerLogsDailyReportQuery.data)) {
			setTimerLogsDailyReport(timerLogsDailyReportQuery.data);
		}
	}, [timerLogsDailyReportQuery.data, setTimerLogsDailyReport]);

	// Function that actually triggers new API calls
	const getTimerLogsDailyReport = useCallback(
		(startDate: Date = moment().startOf('year').toDate(), endDate: Date = moment().endOf('day').toDate()) => {
			if (!baseParams) {
				console.log('Missing required parameters for timer logs daily report');
				return;
			}
			// Triggers a new API call with new dates
			setCurrentDateRange({ startDate, endDate });
		},
		[baseParams]
	);

	// Auto-fetch on mount like original
	useEffect(() => {
		if (firstLoad) {
			getTimerLogsDailyReport();
		}
	}, [getTimerLogsDailyReport, firstLoad]);

	return {
		timerLogsDailyReport,
		timerLogsDailyReportLoading: timerLogsDailyReportQuery.isLoading,
		firstLoadTimeLogs,
		getTimerLogsDailyReport // Function exposed for dynamic usage
	};
}
