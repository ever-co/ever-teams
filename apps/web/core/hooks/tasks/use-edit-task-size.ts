'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { ITaskSizesCreate } from '@/core/types/interfaces/task/task-size';
import { useInvalidateTaskSizes } from './use-invalidate-task-sizes';

/**
 * Hook for editing an existing task size.
 *
 * @returns Object containing:
 * - `editTaskSize` - function(id, data) to edit a task size
 * - `editTaskSizeLoading` - whether the mutation is pending
 */
export function useEditTaskSize() {
	const { invalidateTaskSizesData, teamId } = useInvalidateTaskSizes();

	const updateTaskSizeMutation = useMutation({
		mutationFn: ({ taskSizeId, data }: { taskSizeId: string; data: ITaskSizesCreate }) => {
			const requestData = { ...data, organizationTeamId: teamId };
			return taskSizeService.editTaskSize({ taskSizeId, data: requestData });
		},
		onSuccess: invalidateTaskSizesData
	});

	const editTaskSize = useCallback(
		(id: string, data: ITaskSizesCreate) => updateTaskSizeMutation.mutateAsync({ taskSizeId: id, data }),
		[updateTaskSizeMutation]
	);

	return {
		editTaskSize,
		editTaskSizeLoading: updateTaskSizeMutation.isPending
	};
}

