import { useMutation } from '@tanstack/react-query';
import { tagService } from '@/core/services/client/api';
import { useInvalidateTags } from './use-invalidate-tags';

/**
 * Hook for updating an existing tag.
 */
export function useUpdateTag() {
	const { invalidateTagsData } = useInvalidateTags();

	const updateTagMutation = useMutation({
		mutationFn: tagService.updateTag,
		onSuccess: invalidateTagsData
	});

	return {
		updateTag: updateTagMutation.mutate,
		updateTagLoading: updateTagMutation.isPending
	};
}

