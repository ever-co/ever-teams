'use client';

import { useMutation } from '@tanstack/react-query';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';

/**
 * Hook for deleting a task status with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `deleteTaskStatus` - Async function to delete a task status by ID
 * - `deleteTaskStatusLoading` - Boolean indicating mutation pending state
 */
export function useDeleteTaskStatus() {
	const { invalidateTaskStatusesData } = useInvalidateTaskStatuses();

	const deleteTaskStatusMutation = useMutation({
		mutationFn: (id: string) => taskStatusService.deleteTaskStatus(id),
		onSuccess: () => invalidateTaskStatusesData()
	});

	return {
		deleteTaskStatus: deleteTaskStatusMutation.mutateAsync,
		deleteTaskStatusLoading: deleteTaskStatusMutation.isPending
	};
}

