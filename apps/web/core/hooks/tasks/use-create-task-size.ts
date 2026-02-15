'use client';

import { useMutation } from '@tanstack/react-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { useInvalidateTaskSizes } from './use-invalidate-task-sizes';

/**
 * Hook for creating a new task size.
 *
 * @returns Object containing:
 * - `createTaskSize` - mutateAsync function to create a task size
 * - `createTaskSizeLoading` - whether the mutation is pending
 */
export function useCreateTaskSize() {
	const { invalidateTaskSizesData, teamId } = useInvalidateTaskSizes();

	const createTaskSizeMutation = useMutation({
		mutationFn: (data: ITaskSizesCreate) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.createTaskSize(requestData);
		},
		onSuccess: invalidateTaskSizesData
	});

	return {
		createTaskSize: createTaskSizeMutation.mutateAsync,
		createTaskSizeLoading: createTaskSizeMutation.isPending
	};
}

