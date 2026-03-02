'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { TTaskVersionUpdate } from '@/core/types/schemas';
import { toast } from 'sonner';
import { useInvalidateTaskVersions } from './use-invalidate-task-versions';

/**
 * Hook for editing an existing task version.
 *
 * @returns Object containing:
 * - `editTaskVersion` - function(id, data) backward compat signature
 * - `editTaskVersionLoading` - whether the mutation is pending
 */
export function useEditTaskVersion() {
	const { invalidateTaskVersionsData } = useInvalidateTaskVersions();

	const editTaskVersionMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: TTaskVersionUpdate }) =>
			taskVersionService.updateTaskVersion({ taskVersionId: id, data }),
		onSuccess: () => {
			toast.success('Task version updated successfully');
			invalidateTaskVersionsData();
		},
		onError: (error) => {
			console.error('Error editing task version:', error);
		}
	});

	const editTaskVersion = useCallback(
		(id: string, data: TTaskVersionUpdate) => editTaskVersionMutation.mutateAsync({ id, data }),
		[editTaskVersionMutation]
	);

	return {
		editTaskVersion,
		editTaskVersionLoading: editTaskVersionMutation.isPending
	};
}

