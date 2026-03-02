'use client';

import { useMutation } from '@tanstack/react-query';
import { taskPriorityService } from '@/core/services/client/api/tasks/task-priority.service';
import { ITaskPrioritiesCreate } from '@/core/types/interfaces/task/task-priority';
import { useInvalidateTaskPriorities } from './use-invalidate-task-priorities';

/**
 * Hook for creating a new task priority.
 *
 * @returns Object containing:
 * - `createTaskPriorities` - mutateAsync function to create a task priority
 * - `createTaskPrioritiesLoading` - whether the mutation is pending
 */
export function useCreateTaskPriority() {
	const { invalidateTaskPrioritiesData, teamId, tenantId } = useInvalidateTaskPriorities();

	const createTaskPriorityMutation = useMutation({
		mutationFn: (data: ITaskPrioritiesCreate) => {
			const isEnabled = !!tenantId && !!teamId;
			if (!isEnabled) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskPriorityService.createTaskPriority(requestData);
		},
		onSuccess: invalidateTaskPrioritiesData
	});

	return {
		createTaskPriorities: createTaskPriorityMutation.mutateAsync,
		createTaskPrioritiesLoading: createTaskPriorityMutation.isPending
	};
}

