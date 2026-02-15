import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { activityService } from '@/core/services/client/api/activities';
import { UseReportActivityProps } from '../use-activity-filters';
import { shouldRetryQuery } from '../../../lib/helpers/retry-utils';

// ==================== TYPES ====================

export interface UseActivityReportListQueryOptions {
	/** Merged props from useActivityFilters (includes auth, filters, date range) */
	mergedProps: Required<UseReportActivityProps> | null;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

// ==================== HOOK ====================

/**
 * Dedicated query hook for the **activity report list** (Apps & URLs page).
 * Wraps `activityService.getActivitiesReport`.
 *
 * Use this hook when you need the activity report grouped by date/employee/project/application.
 *
 * @param options.mergedProps - Merged filter props from `useActivityFilters`
 * @param options.enabled - Controls whether the query fires. Defaults to `true`.
 *
 * @example
 * ```typescript
 * const { mergedProps, enabled } = useActivityFilters();
 * const { activityReport, isLoading } = useActivityReportListQuery({ mergedProps, enabled });
 * ```
 */
export function useActivityReportListQuery({ mergedProps, enabled = true }: UseActivityReportListQueryOptions) {
	const query = useQuery({
		queryKey: [
			queryKeys.activities.activityReport({
				tenantId: mergedProps?.tenantId,
				organizationId: mergedProps?.organizationId,
				startDate: mergedProps?.startDate,
				endDate: mergedProps?.endDate,
				groupBy: mergedProps?.groupBy
			})
		],
		queryFn: () => activityService.getActivitiesReport(mergedProps!),
		enabled: enabled && !!mergedProps,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: shouldRetryQuery,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	// ==================== REFETCH ====================

	const refetchActivityReport = useCallback(async () => {
		return query.refetch();
	}, [query]);

	return {
		/** Activity report data array */
		activityReport: Array.isArray(query.data?.data) ? query.data.data : [],
		/** Whether the activity report query is currently loading */
		isLoading: query.isLoading,
		/** Refetch activity report data */
		refetchActivityReport,
		/** Full React Query object for advanced usage */
		query
	};
}

