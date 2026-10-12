import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { ITimeLogReportWeeklyRequest } from '@/core/types/interfaces/activity/activity-report';
import { UseReportActivityProps } from '../use-activity-filters';
import { shouldRetryQuery } from '../../../lib/helpers/retry-utils';

export interface UseActivityWeeklyReportQueryOptions {
	/** Merged props from useActivityFilters: the member scope and the team and project filters */
	mergedProps: Required<UseReportActivityProps> | null;
	/** First instant of the range, in local time */
	startDate: Date;
	/** Last instant of the range, in local time */
	endDate: Date;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

/**
 * Time tracked per member and per day between two instants, from `timeLogService.getTimeLogReportWeekly`.
 */
export function useActivityWeeklyReportQuery({
	mergedProps,
	startDate,
	endDate,
	enabled = true
}: UseActivityWeeklyReportQueryOptions) {
	const params: ITimeLogReportWeeklyRequest = {
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
		timeZone: getDefaultTimezone(),
		employeeIds: mergedProps?.employeeIds ?? [],
		projectIds: mergedProps?.projectIds ?? [],
		teamIds: mergedProps?.teamIds ?? []
	};

	const query = useQuery({
		queryKey: queryKeys.activities.weekly({
			tenantId: mergedProps?.tenantId,
			organizationId: mergedProps?.organizationId,
			...params
		}),
		queryFn: () => timeLogService.getTimeLogReportWeekly(params),
		enabled: enabled && !!mergedProps,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		retry: shouldRetryQuery,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});

	return {
		weeklyReport: query.data ?? [],
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch
	};
}
