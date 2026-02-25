import { timeLogService } from '@/core/services/client/api';
import { ITimeLogUpdatePayload } from '@/core/types/interfaces/timesheet/time-log.interface';
import { useMutation } from '@tanstack/react-query';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

export const updateTimeLogMutation = () => {
	const { invalidateTimesheetData } = useTimesheetInvalidation();

	const mutation = useMutation({
		mutationFn: async (payload: ITimeLogUpdatePayload) => {
			return await timeLogService.updateTimeLog(payload);
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	return mutation;
};
