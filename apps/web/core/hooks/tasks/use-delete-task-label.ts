'use client';

import { useMutation } from '@tanstack/react-query';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { useInvalidateTaskLabels } from './use-invalidate-task-labels';

/**
 * Hook for deleting a task label.
 *
 * This is the raw mutation without optimistic UI.
 * For optimistic UI, use the deprecated `useTaskLabels()` wrapper
 * or compose with `useTaskLabelsQuery().addOptimisticLabel`.
 *
 * @returns Object containing:
 * - `deleteTaskLabels` - mutateAsync function to delete a task label by ID
 * - `deleteTaskLabelsLoading` - whether the mutation is pending
 */
export function useDeleteTaskLabel() {
	const { invalidateTaskLabelsData } = useInvalidateTaskLabels();

	const deleteTaskLabelMutation = useMutation({
		mutationFn: (id: string) => taskLabelService.deleteTaskLabels(id),
		onSuccess: invalidateTaskLabelsData
	});

	return {
		deleteTaskLabels: deleteTaskLabelMutation.mutateAsync,
		deleteTaskLabelsLoading: deleteTaskLabelMutation.isPending
	};
}

