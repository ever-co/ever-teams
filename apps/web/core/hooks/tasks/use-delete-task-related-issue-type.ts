'use client';

import { useMutation } from '@tanstack/react-query';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { useInvalidateTaskRelatedIssueTypes } from './use-invalidate-task-related-issue-types';

/**
 * Hook for deleting a task related issue type.
 */
export function useDeleteTaskRelatedIssueType() {
	const { invalidateTaskRelatedIssueTypesData } = useInvalidateTaskRelatedIssueTypes();

	const deleteMutation = useMutation({
		mutationFn: (id: string) => taskRelatedIssueTypeService.deleteTaskRelatedIssueType(id),
		onSuccess: invalidateTaskRelatedIssueTypesData
	});

	return {
		deleteTaskRelatedIssueType: deleteMutation.mutateAsync,
		deleteTaskRelatedIssueTypeLoading: deleteMutation.isPending
	};
}

