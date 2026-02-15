'use client';

import { useMutation } from '@tanstack/react-query';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
import { ITaskStatusCreate } from '@/core/types/interfaces/task/task-status/task-status';
import { useInvalidateTaskStatuses } from './use-invalidate-task-statuses';

/**
 * Hook for creating a task status with cache invalidation.
 *
 * @returns {Object} An object containing:
 * - `createTaskStatus` - Async function to create a task status
 * - `createTaskStatusLoading` - Boolean indicating mutation pending state
 */
export function useCreateTaskStatus() {
	const { invalidateTaskStatusesData, teamId, tenantId } = useInvalidateTaskStatuses();

	const createTaskStatusMutation = useMutation({
		mutationFn: (data: ITaskStatusCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskStatusService.createTaskStatus(requestData);
		},
		onSuccess: () => invalidateTaskStatusesData()
	});

	return {
		createTaskStatus: createTaskStatusMutation.mutateAsync,
		createTaskStatusLoading: createTaskStatusMutation.isPending
	};
}

