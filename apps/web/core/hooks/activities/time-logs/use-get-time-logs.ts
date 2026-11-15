import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api';
import { TGetTimerLogsDailyReportRequest } from '@/core/types/schemas';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import moment from 'moment';

type UseGetTimeLogsOptions = {
	enabled?: boolean;
	/** Keeps the last answer on screen while new parameters are read (a task added to a plan), instead of none. */
	keepsPreviousData?: boolean;
};

export function useGetTimeLogs(params?: TGetTimerLogsDailyReportRequest, options?: UseGetTimeLogsOptions) {
	return useQuery({
		enabled: options?.enabled ?? true,
		queryKey: params ? queryKeys.timeLogs.withParams(params) : queryKeys.timeLogs.all,
		queryFn: async () => {
			if (!params?.startDate && !params?.endDate && !params?.date) {
				throw new Error('Timer logs parameters (startDate or endDate or date) are required');
			}

			if (moment(params?.endDate).isBefore(params?.startDate)) {
				throw new Error('End date must be after start date');
			}

			return timeLogService.getTimeLogs(params);
		},
		placeholderData: options?.keepsPreviousData ? keepPreviousData : undefined,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30 // 30 minutes in cache
	});
}
