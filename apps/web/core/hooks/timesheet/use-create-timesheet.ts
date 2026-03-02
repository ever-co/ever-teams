'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { useAuthenticateUser } from '../auth';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

/**
 * Hook for creating timesheet entries.
 * Handles the create mutation with automatic cache invalidation.
 */
export function useCreateTimesheet() {
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();

	const createTimesheetMutation = useMutation({
		mutationFn: async (timesheetParams: IUpdateTimesheetRequest) => {
			return await timeLogService.createTimesheetFrom(timesheetParams);
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const createTimesheet = useCallback(
		async ({ ...timesheetParams }: IUpdateTimesheetRequest) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			try {
				const response = await createTimesheetMutation.mutateAsync(timesheetParams);
				return response.data;
			} catch (error) {
				if (axios.isAxiosError(error)) {
					console.error('Axios Error:', {
						status: error.response?.status,
						statusText: error.response?.statusText,
						data: error.response?.data
					});
					throw new Error(`Request failed: ${error.message}`);
				}
				console.error('Error:', error instanceof Error ? error.message : error);
				throw error;
			}
		},
		[createTimesheetMutation, user]
	);

	return {
		createTimesheet,
		loadingCreateTimesheet: createTimesheetMutation.isPending
	};
}

