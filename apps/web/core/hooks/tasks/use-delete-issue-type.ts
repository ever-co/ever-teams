'use client';

import { useMutation } from '@tanstack/react-query';
import { issueTypeService } from '@/core/services/client/api/tasks/issue-type.service';
import { useInvalidateIssueTypes } from './use-invalidate-issue-types';

/**
 * Hook for deleting an issue type.
 *
 * @returns Object containing:
 * - `deleteIssueType` - mutateAsync function to delete an issue type by ID
 * - `deleteIssueTypeLoading` - whether the mutation is pending
 */
export function useDeleteIssueType() {
	const { invalidateIssueTypesData } = useInvalidateIssueTypes();

	const deleteIssueTypeMutation = useMutation({
		mutationFn: (id: string) => issueTypeService.deleteIssueType(id),
		onSuccess: invalidateIssueTypesData
	});

	return {
		deleteIssueType: deleteIssueTypeMutation.mutateAsync,
		deleteIssueTypeLoading: deleteIssueTypeMutation.isPending
	};
}

