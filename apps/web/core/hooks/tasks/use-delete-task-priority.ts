'use client';

import { useMutation } from '@tanstack/react-query';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { useInvalidateTaskPriorities } from './use-invalidate-task-priorities';

/**
 * Hook for deleting a task priority.
 *
 * @returns Object containing:
 * - `deleteTaskPriorities` - mutateAsync function to delete a task priority by ID
 * - `deleteTaskPrioritiesLoading` - whether the mutation is pending
 */
export function useDeleteTaskPriority() {
	const { invalidateTaskPrioritiesData } = useInvalidateTaskPriorities();

	const deleteTaskPriorityMutation = useMutation({
		mutationFn: (id: string) => taskPriorityService.deleteTaskPriority(id),
		onSuccess: invalidateTaskPrioritiesData
	});

	return {
		deleteTaskPriorities: deleteTaskPriorityMutation.mutateAsync,
		deleteTaskPrioritiesLoading: deleteTaskPriorityMutation.isPending
	};
}

