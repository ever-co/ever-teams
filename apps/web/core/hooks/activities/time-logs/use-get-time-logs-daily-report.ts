import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api';
import { TGetTimerLogsDailyReportRequest } from '@/core/types/schemas/timer/time-log.schema';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

export function useGetTimeLogsDailyReport(params: TGetTimerLogsDailyReportRequest) {
	return useQuery({
		queryKey: queryKeys.timeLog.withParams(params),
		queryFn: async () => {
			const { startDate, endDate, ...baseParams } = params;
			if (!startDate || !endDate) {
				throw new Error('Timer logs daily report parameters are required');
			}

			if (moment(endDate).isBefore(startDate)) {
				throw new Error('End date must be after start date');
			}

			return timeLogService.getTimerLogsDailyReport({
				...baseParams,
				startDate,
				endDate
			});
		},
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30 // 30 minutes in cache
	});
}
