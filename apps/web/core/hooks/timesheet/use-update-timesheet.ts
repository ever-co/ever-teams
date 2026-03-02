'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { timeSheetService } from '@/core/services/client/api/timesheets/timesheet.service';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { useAuthenticateUser } from '../auth';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

/**
 * Hook for updating timesheet entries and their statuses.
 * Groups both update operations (content + status) since they share the same domain.
 */
export function useUpdateTimesheet() {
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();

	const updateTimesheetMutation = useMutation({
		mutationFn: async (timesheet: IUpdateTimesheetRequest) => {
			return await timeLogService.updateTimesheetFrom(timesheet);
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const updateTimesheetStatusMutation = useMutation({
		mutationFn: async ({ status, ids }: { status: ETimesheetStatus; ids: string[] | string }) => {
			const idsArray = Array.isArray(ids) ? ids : [ids];
			return await timeSheetService.updateStatusTimesheetFrom({ ids: idsArray, status });
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const updateTimesheet = useCallback(
		async (timesheet: IUpdateTimesheetRequest) => {
			if (!user) {
				console.warn('User not authenticated!');
				return;
			}
			try {
				const response = await updateTimesheetMutation.mutateAsync(timesheet);
				return response.data;
			} catch (error) {
				console.error('Error updating the timesheet:', error);
				throw error;
			}
		},
		[updateTimesheetMutation, user]
	);

	const updateTimesheetStatus = useCallback(
		async ({ status, ids }: { status: ETimesheetStatus; ids: string[] | string }) => {
			if (!user) return;
			const idsArray = Array.isArray(ids) ? ids : [ids];
			try {
				await updateTimesheetStatusMutation.mutateAsync({ status, ids: idsArray });
			} catch (error) {
				console.error('Error updating timesheet status:', error);
			}
		},
		[updateTimesheetStatusMutation, user]
	);

	return {
		updateTimesheet,
		loadingUpdateTimesheet: updateTimesheetMutation.isPending,
		updateTimesheetStatus,
		loadingUpdateTimesheetStatus: updateTimesheetStatusMutation.isPending
	};
}

