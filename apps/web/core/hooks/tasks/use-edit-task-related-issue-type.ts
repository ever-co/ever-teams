'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';
import { useInvalidateTaskRelatedIssueTypes } from './use-invalidate-task-related-issue-types';

/**
 * Hook for editing an existing task related issue type.
 *
 * @returns Object containing:
 * - `editTaskRelatedIssueType` - function(id, data) backward compat signature
 * - `editTaskRelatedIssueTypeLoading` - whether the mutation is pending
 */
export function useEditTaskRelatedIssueType() {
	const { invalidateTaskRelatedIssueTypesData, tenantId, teamId } = useInvalidateTaskRelatedIssueTypes();

	const editMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: ITaskRelatedIssueTypeCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return taskRelatedIssueTypeService.editTaskRelatedIssueType(id, data, tenantId);
		},
		onSuccess: invalidateTaskRelatedIssueTypesData
	});

	const editTaskRelatedIssueType = useCallback(
		(id: string, data: ITaskRelatedIssueTypeCreate) => editMutation.mutateAsync({ id, data }),
		[editMutation]
	);

	return {
		editTaskRelatedIssueType,
		editTaskRelatedIssueTypeLoading: editMutation.isPending
	};
}

