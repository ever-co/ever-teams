'use client';

import { useMutation } from '@tanstack/react-query';
import { taskSizeService } from '@/core/services/client/api/tasks/task-size.service';
import { useInvalidateTaskSizes } from './use-invalidate-task-sizes';

/**
 * Hook for deleting a task size.
 *
 * @returns Object containing:
 * - `deleteTaskSize` - mutateAsync function to delete a task size by ID
 * - `deleteTaskSizeLoading` - whether the mutation is pending
 */
export function useDeleteTaskSize() {
	const { invalidateTaskSizesData } = useInvalidateTaskSizes();

	const deleteTaskSizeMutation = useMutation({
		mutationFn: (id: string) => taskSizeService.deleteTaskSize(id),
		onSuccess: invalidateTaskSizesData
	});

	return {
		deleteTaskSize: deleteTaskSizeMutation.mutateAsync,
		deleteTaskSizeLoading: deleteTaskSizeMutation.isPending
	};
}

