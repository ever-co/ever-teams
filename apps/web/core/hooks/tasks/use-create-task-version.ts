'use client';

import { useMutation } from '@tanstack/react-query';
import { taskVersionService } from '@/core/services/client/api/tasks/task-version.service';
import { TTaskVersionCreate } from '@/core/types/schemas';
import { useInvalidateTaskVersions } from './use-invalidate-task-versions';

/**
 * Hook for creating a new task version.
 */
export function useCreateTaskVersion() {
	const { invalidateTaskVersionsData } = useInvalidateTaskVersions();

	const createTaskVersionMutation = useMutation({
		mutationFn: (data: TTaskVersionCreate) => taskVersionService.createTaskVersion(data),
		onSuccess: () => invalidateTaskVersionsData()
	});

	return {
		createTaskVersion: createTaskVersionMutation.mutateAsync,
		createTaskVersionLoading: createTaskVersionMutation.isPending
	};
}
