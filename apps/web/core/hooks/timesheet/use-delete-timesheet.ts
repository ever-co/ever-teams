'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { useTimesheetInvalidation } from './use-timesheet-invalidation';

/**
 * Hook for deleting timesheet entries.
 * Handles the delete mutation with automatic cache invalidation.
 */
export function useDeleteTimesheet() {
	const { user } = useAuthenticateUser();
	const { invalidateTimesheetData } = useTimesheetInvalidation();

	const deleteTimesheetMutation = useMutation({
		mutationFn: async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			return await timeLogService.deleteTaskTimesheetLogs({ logIds });
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const deleteTaskTimesheet = useCallback(
		async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			if (!logIds.length) {
				throw new Error('No timesheet IDs provided for deletion');
			}
			try {
				await deleteTimesheetMutation.mutateAsync({ logIds });
			} catch (error) {
				console.error('Failed to delete timesheets:', error);
				throw error;
			}
		},
		[user, deleteTimesheetMutation]
	);

	return {
		deleteTaskTimesheet,
		loadingDeleteTimesheet: deleteTimesheetMutation.isPending
	};
}

