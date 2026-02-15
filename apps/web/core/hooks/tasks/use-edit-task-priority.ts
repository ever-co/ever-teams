'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { useInvalidateTaskPriorities } from './use-invalidate-task-priorities';

/**
 * Hook for editing an existing task priority.
 *
 * @returns Object containing:
 * - `editTaskPriorities` - function(id, data) to edit a task priority
 * - `editTaskPrioritiesLoading` - whether the mutation is pending
 */
export function useEditTaskPriority() {
	const { invalidateTaskPrioritiesData, teamId, tenantId } = useInvalidateTaskPriorities();

	const updateTaskPriorityMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskPrioritiesCreate }) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskPriorityService.editTaskPriority({ taskPriorityId: id, data });
		},
		onSuccess: invalidateTaskPrioritiesData
	});

	const editTaskPriorities = useCallback(
		(id: string, data: ITaskPrioritiesCreate) => updateTaskPriorityMutation.mutateAsync({ id, data }),
		[updateTaskPriorityMutation]
	);

	return {
		editTaskPriorities,
		editTaskPrioritiesLoading: updateTaskPriorityMutation.isPending
	};
}

