'use client';

import { timeLogService } from '@/core/services/client/api';
import { ITimeLogUpdatePayload } from '@/core/types/interfaces/timesheet/time-log.interface';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

export const useUpdateTimeLogMutation = () => {
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	const queryClient = useQueryClient();
	// The dashboards read the same time logs through the activity reports, which stay fresh for 10 minutes.
	const invalidateDashboardFigures = () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });

	const mutation = useMutation({
		mutationFn: async (payload: ITimeLogUpdatePayload) => {
			return await timeLogService.updateTimeLog(payload);
		},
		onSuccess: () => {
			invalidateTimesheetData();
			invalidateDashboardFigures();
		}
	});

	return mutation;
};
