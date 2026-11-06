'use client';

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { queryKeys } from '@/core/query/keys';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

/**
 * Hook for deleting timesheet entries.
 * Handles the delete mutation with automatic cache invalidation.
 */
export function useDeleteTimesheet() {
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	const queryClient = useQueryClient();
	// The dashboards read the same time logs through the activity reports, which stay fresh for 10 minutes.
	const invalidateDashboardFigures = () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });

	const deleteTimesheetMutation = useMutation({
		mutationFn: async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			return await timeLogService.deleteTaskTimesheetLogs({ logIds });
		},
		onSuccess: () => {
			invalidateTimesheetData();
			invalidateDashboardFigures();
		}
	});

	const deleteTimesheetMutate = deleteTimesheetMutation.mutateAsync;
	const deleteTaskTimesheet = useCallback(
		async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			if (!logIds.length) {
				throw new Error('No timesheet IDs provided for deletion');
			}
			try {
				await deleteTimesheetMutate({ logIds });
			} catch (error) {
				console.error('Failed to delete timesheets:', error);
				throw error;
			}
		},
		[user, deleteTimesheetMutate]
	);

	return {
		deleteTaskTimesheet,
		loadingDeleteTimesheet: deleteTimesheetMutation.isPending
	};
}
