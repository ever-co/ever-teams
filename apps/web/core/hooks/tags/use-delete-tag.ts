import { useMutation } from '@tanstack/react-query';
import { tagService } from '@/core/services/client/api';
import { useInvalidateTags } from './use-invalidate-tags';

/**
 * Hook for deleting a tag.
 */
export function useDeleteTag() {
	const { invalidateTagsData } = useInvalidateTags();

	const deleteTagMutation = useMutation({
		mutationFn: tagService.deleteTag,
		onSuccess: invalidateTagsData
	});

	return {
		deleteTag: deleteTagMutation.mutate,
		deleteTagLoading: deleteTagMutation.isPending
	};
}

