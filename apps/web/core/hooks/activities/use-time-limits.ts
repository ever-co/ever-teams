import { timeLimitsAtom } from '@/core/stores/timer/time-limits';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { TGetTimeLimitReport } from '@/core/types/schemas';

export function useTimeLimits() {
	const [timeLimitsReports, setTimeLimitsReport] = useAtom(timeLimitsAtom);
	const queryClient = useQueryClient();

	// State to track current query parameters for React Query
	const [currentParams, setCurrentParams] = useState<TGetTimeLimitReport | null>(null);

	// React Query integration for better caching and performance
	const timeLimitsQuery = useQuery({
		queryKey: queryKeys.timer.timeLimits.byParams(currentParams),
		queryFn: async () => {
			if (!currentParams) {
				throw new Error('Time limits parameters are required');
			}

			const res = await timeLogService.getTimeLimitsReport(currentParams);
			return res;
		},
		enabled: !!currentParams
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (Array.isArray(timeLimitsQuery.data)) {
			// Type assertion for backward compatibility with existing Jotai atom
			setTimeLimitsReport(timeLimitsQuery.data);
		}
	}, [timeLimitsQuery.data]);

	// Preserve exact same interface for existing consumers
	const getTimeLimitsReport = useCallback(
		async (data: TGetTimeLimitReport) => {
			try {
				setCurrentParams(data);

				// BEST PRACTICE - ensureQueryData uses cache intelligently
				const result = await queryClient.ensureQueryData({
					queryKey: queryKeys.timer.timeLimits.byParams(data),
					queryFn: async () => await timeLogService.getTimeLimitsReport(data)
				});

				return { data: result };
			} catch (error) {
				console.error(error);
				throw error;
			}
		},
		[queryClient]
	);

	return {
		getTimeLimitReportLoading: timeLimitsQuery.isLoading,
		getTimeLimitsReport,
		timeLimitsReports
	};
}
