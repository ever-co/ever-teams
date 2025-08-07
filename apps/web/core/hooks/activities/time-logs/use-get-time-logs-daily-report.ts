import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api';
import { TGetTimerLogsDailyReportRequest } from '@/core/types/schemas/timer/time-log.schema';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { toast } from 'sonner';

export function useGetTimeLogsDailyReport(params?: TGetTimerLogsDailyReportRequest) {
	return useQuery({
		queryKey: params ? queryKeys.timeLog.withParams(params) : queryKeys.timeLog.all,
		queryFn: async () => {
			if (!params?.startDate || !params?.endDate) {
				toast.error('Timer logs daily report parameters (startDate and endDate) are required');
				throw new Error('Timer logs daily report parameters (startDate and endDate) are required');
			}

			if (moment(params.endDate).isBefore(params.startDate)) {
				toast.error('End date must be after start date');
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
