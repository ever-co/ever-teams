import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api';
import { TGetTimerLogsDailyReportRequest } from '@/core/types/schemas';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

type UseGetTimeLogsOptions = {
	enabled?: boolean;
	/**
	 * Keeps the last answer on screen while the logs of other tasks on the same days are read (a task added to a plan),
	 * instead of none. Logs of other days (another plan) are never shown in place of the new ones.
	 */
	keepsPreviousData?: boolean;
};

const TASK_IDS_KEY_PART = 'taskIds-';

/** A time-logs query key without its tasks: what else the logs were read for (their days). */
function keyWithoutTasksOf(queryKey: readonly unknown[]) {
	return queryKey.filter((part) => !String(part).startsWith(TASK_IDS_KEY_PART)).join('|');
}

export function useGetTimeLogs(params?: TGetTimerLogsDailyReportRequest, options?: UseGetTimeLogsOptions) {
	const queryKey = params ? queryKeys.timeLogs.withParams(params) : queryKeys.timeLogs.all;
	return useQuery({
		enabled: options?.enabled ?? true,
		queryKey,
		queryFn: async () => {
			if (!params?.startDate && !params?.endDate && !params?.date) {
				throw new Error('Timer logs parameters (startDate or endDate or date) are required');
			}

			if (moment(params?.endDate).isBefore(params?.startDate)) {
				throw new Error('End date must be after start date');
			}

			return timeLogService.getTimeLogs(params);
		},
		placeholderData: options?.keepsPreviousData
			? (previousData, previousQuery) => {
					const isSameDays =
						!!previousQuery && keyWithoutTasksOf(previousQuery.queryKey) === keyWithoutTasksOf(queryKey);
					return isSameDays ? previousData : undefined;
				}
			: undefined,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30 // 30 minutes in cache
	});
}
