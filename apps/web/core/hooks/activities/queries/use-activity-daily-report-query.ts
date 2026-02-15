import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { UseReportActivityProps } from '../use-activity-filters';
import { shouldRetryQuery } from '../../../lib/helpers/retry-utils';

// ==================== TYPES ====================

export interface UseActivityDailyReportQueryOptions {
	/** Merged props from useActivityFilters (includes auth, filters, date range) */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

// ==================== HOOK ====================

/**
 * Dedicated query hook for the **daily report** data.
 * Wraps `timeLogService.getTimeLogReportDaily`.
 *
 * Use this hook when you need the daily grouped report (table data on team dashboard / time-and-activity).
 *
 * @param options.mergedProps - Merged filter props from `useActivityFilters`
 * @param options.enabled - Controls whether the query fires. Defaults to `true`.
 *
 * @example
 * ```typescript
 * const { mergedProps, enabled } = useActivityFilters();
 * const { rapportDailyActivity, isLoading } = useActivityDailyReportQuery({ mergedProps, enabled });
 * ```
 */
export function useActivityDailyReportQuery({ mergedProps, enabled = true }: UseActivityDailyReportQueryOptions) {
	const query = useQuery({
		queryKey: [
			queryKeys.activities.daily({
				tenantId: mergedProps?.tenantId,
				organizationId: mergedProps?.organizationId,
				startDate: mergedProps?.startDate,
				endDate: mergedProps?.endDate,
				groupBy: mergedProps?.groupBy
			})
		],
		queryFn: () => timeLogService.getTimeLogReportDaily(mergedProps!),
		enabled: enabled && !!mergedProps,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: shouldRetryQuery,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// ==================== REFETCH ====================

	const refetchDailyReport = useCallback(async () => {
		return query.refetch();
	}, [query]);

	return {
		/** Daily report data array — defensive extraction handles unexpected API response shapes */
		rapportDailyActivity: Array.isArray(query.data?.data) ? query.data.data : [],
		/** Whether the daily report query is currently loading */
		isLoading: query.isLoading,
		/** Refetch daily report data */
		refetchDailyReport,
		/** Full React Query object for advanced usage */
		query
	};
}

