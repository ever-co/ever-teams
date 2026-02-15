'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';

/**
 * Hook for editing a task status with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `editTaskStatus` - Async function to edit a task status (id, data) => Promise
 * - `editTaskStatusLoading` - Boolean indicating mutation pending state
 */
export function useEditTaskStatus() {
	const { invalidateTaskStatusesData, teamId, tenantId } = useInvalidateTaskStatuses();

	const updateTaskStatusMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskStatusCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskStatusService.editTaskStatus({ taskStatusId: id, data });
		},
		onSuccess: () => invalidateTaskStatusesData()
	});

	const editTaskStatus = useCallback(
		(id: string, data: ITaskStatusCreate) => updateTaskStatusMutation.mutateAsync({ id, data }),
		[updateTaskStatusMutation]
	);

	return {
		editTaskStatus,
		editTaskStatusLoading: updateTaskStatusMutation.isPending
	};
}

