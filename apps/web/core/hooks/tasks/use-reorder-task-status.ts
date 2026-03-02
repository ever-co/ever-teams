'use client';

import { useMutation } from '@tanstack/react-query';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { ITaskStatusOrder } from '@/core/types/interfaces/task/task-status/task-status-order';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';
import { toast } from 'sonner';

/**
 * Hook for reordering task statuses with cache invalidation and toast notifications.
 *
 * @returns {Object} An object containing:
 * - `reOrderTaskStatus` - Async function to reorder task statuses
 * - `reOrderTaskStatusLoading` - Boolean indicating mutation pending state
 */
export function useReorderTaskStatus() {
	const { invalidateTaskStatusesData, tenantId } = useInvalidateTaskStatuses();

	const reorderTaskStatusMutation = useMutation({
		mutationFn: (data: ITaskStatusOrder) => {
			if (!tenantId) {
				throw new Error('Required parameters missing: tenantId is required');
			}
			return taskStatusService.editTaskStatusOrder(data);
		},
		onSuccess: () => {
			invalidateTaskStatusesData();
			toast.success('Task statuses reordered successfully');
		},
		onError: (error) => {
			toast.error('Failed to reorder task statuses', {
				description: error.message
			});
		}
	});

	return {
		reOrderTaskStatus: reorderTaskStatusMutation.mutateAsync,
		reOrderTaskStatusLoading: reorderTaskStatusMutation.isPending
	};
}

