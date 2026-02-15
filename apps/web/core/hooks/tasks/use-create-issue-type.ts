'use client';

import { useMutation } from '@tanstack/react-query';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { useInvalidateIssueTypes } from './use-invalidate-issue-types';

/**
 * Hook for creating a new issue type.
 *
 * @returns Object containing:
 * - `createIssueType` - mutateAsync function to create an issue type
 * - `createIssueTypeLoading` - whether the mutation is pending
 */
export function useCreateIssueType() {
	const { invalidateIssueTypesData, teamId, tenantId } = useInvalidateIssueTypes();

	const createIssueTypeMutation = useMutation({
		mutationFn: (data: IIssueTypesCreate) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const requestData = { ...data, organizationTeamId: teamId };
			return issueTypeService.createIssueType(requestData);
		},
		onSuccess: invalidateIssueTypesData
	});

	return {
		createIssueType: createIssueTypeMutation.mutateAsync,
		createIssueTypeLoading: createIssueTypeMutation.isPending
	};
}

