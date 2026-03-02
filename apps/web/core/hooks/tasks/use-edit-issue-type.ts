'use client';

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { IIssueTypesCreate } from '@/core/types/interfaces/task/issue-type';
import { useInvalidateIssueTypes } from './use-invalidate-issue-types';

/**
 * Hook for editing an existing issue type.
 *
 * @returns Object containing:
 * - `editIssueType` - function(id, data) to edit an issue type (backward compat signature)
 * - `editIssueTypeLoading` - whether the mutation is pending
 */
export function useEditIssueType() {
	const { invalidateIssueTypesData, tenantId, teamId } = useInvalidateIssueTypes();

	const updateIssueTypeMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: IIssueTypesCreate }) => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			return issueTypeService.editIssueType({ issueTypeId: id, data });
		},
		onSuccess: invalidateIssueTypesData
	});

	// Backward compat wrapper: editIssueType(id, data)
	const editIssueType = useCallback(
		(id: string, data: IIssueTypesCreate) => updateIssueTypeMutation.mutateAsync({ id, data }),
		[updateIssueTypeMutation]
	);

	return {
		editIssueType,
		editIssueTypeLoading: updateIssueTypeMutation.isPending
	};
}

