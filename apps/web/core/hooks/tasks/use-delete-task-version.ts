'use client';

import { useMutation } from '@tanstack/react-query';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { toast } from 'sonner';
import { useInvalidateTaskVersions } from './use-invalidate-task-versions';

/**
 * Hook for deleting a task version.
 */
export function useDeleteTaskVersion() {
	const { invalidateTaskVersionsData } = useInvalidateTaskVersions();

	const deleteTaskVersionMutation = useMutation({
		mutationFn: (id: string) => taskVersionService.deleteTaskVersion(id),
		onSuccess: () => {
			toast.success('Task version deleted successfully');
			invalidateTaskVersionsData();
		},
		onError: (error) => {
			console.error('Error deleting task version:', error);
		}
	});

	return {
		deleteTaskVersion: deleteTaskVersionMutation.mutateAsync,
		deleteTaskVersionLoading: deleteTaskVersionMutation.isPending
	};
}

