import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { UseReportActivityProps } from '../use-activity-filters';
import { shouldRetryQuery } from '../../../lib/helpers/retry-utils';

// ==================== TYPES ====================

export interface UseActivityChartQueryOptions {
	/** Merged props from useActivityFilters (includes auth, filters, date range) */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

// ==================== HOOK ====================

/**
 * Dedicated query hook for the **chart activity** data.
 * Wraps `timeLogService.getTimeLogReportDailyChart`.
 *
 * Use this hook when you need the daily chart data (bar/line chart on the team dashboard).
 *
 * @param options.mergedProps - Merged filter props from `useActivityFilters`
 * @param options.enabled - Controls whether the query fires. Defaults to `true`.
 *
 * @example
 * ```typescript
 * const { mergedProps, enabled } = useActivityFilters();
 * const { data, isLoading, refetch } = useActivityChartQuery({ mergedProps, enabled });
 * ```
 */
export function useActivityChartQuery({ mergedProps, enabled = true }: UseActivityChartQueryOptions) {
	const query = useQuery({
		queryKey: [
			queryKeys.activities.dailyChart({
				tenantId: mergedProps?.tenantId,
				organizationId: mergedProps?.organizationId,
				startDate: mergedProps?.startDate,
				endDate: mergedProps?.endDate,
				groupBy: mergedProps?.groupBy
			})
		],
		queryFn: () => timeLogService.getTimeLogReportDailyChart(mergedProps!),
		enabled: enabled && !!mergedProps,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: shouldRetryQuery,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// ==================== REFETCH ====================

	const refetchChartActivity = useCallback(async () => {
		return query.refetch();
	}, [query]);

	return {
		/** Chart activity data array — defensive extraction handles unexpected API response shapes */
		rapportChartActivity: Array.isArray(query.data?.data) ? query.data.data : [],
		/** Whether the chart query is currently loading */
		isLoading: query.isLoading,
		/** Refetch chart data */
		refetchChartActivity,
		/** Full React Query object for advanced usage */
		query
	};
}

