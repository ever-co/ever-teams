import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api';
import { TGetTimerLogsDailyReportRequest } from '@/core/types/schemas/timer/time-log.schema';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

export function useGetTimeLogsDailyReport(params?: TGetTimerLogsDailyReportRequest) {
	return useQuery({
		queryKey: params ? queryKeys.timeLogs.dailyReport.withParams(params) : queryKeys.timeLogs.all,
		queryFn: async () => {
			if (!params?.startDate && !params?.endDate && !params?.date) {
				throw new Error('Timer logs daily report parameters (startDate or endDate or date) are required');
			}

			if (moment(params?.endDate).isBefore(params?.startDate)) {
				throw new Error('End date must be after start date');
			}

			return timeLogService.getTimerLogsDailyReport({
				...params
			});
		},
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30 // 30 minutes in cache
	});
}
