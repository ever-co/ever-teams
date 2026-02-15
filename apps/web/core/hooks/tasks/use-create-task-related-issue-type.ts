'use client';

import { useMutation } from '@tanstack/react-query';
import { taskRelatedIssueTypeService } from '@/core/services/client/api/tasks/task-related-issue-type.service';
import { ITaskRelatedIssueTypeCreate } from '@/core/types/interfaces/task/related-issue-type';
import { useInvalidateTaskRelatedIssueTypes } from './use-invalidate-task-related-issue-types';

/**
 * Hook for creating a new task related issue type.
 */
export function useCreateTaskRelatedIssueType() {
	const { invalidateTaskRelatedIssueTypesData, tenantId, teamId } = useInvalidateTaskRelatedIssueTypes();

	const createMutation = useMutation({
		mutationFn: (data: ITaskRelatedIssueTypeCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return taskRelatedIssueTypeService.createTaskRelatedIssueType(requestData, tenantId);
		},
		onSuccess: invalidateTaskRelatedIssueTypesData
	});

	return {
		createTaskRelatedIssueType: createMutation.mutateAsync,
		createTaskRelatedIssueTypeLoading: createMutation.isPending
	};
}

