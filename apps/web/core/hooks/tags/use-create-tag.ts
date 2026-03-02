import { useMutation } from '@tanstack/react-query';
import { tagService } from '@/core/services/client/api';
import { useInvalidateTags } from './use-invalidate-tags';

/**
 * Hook for creating a new tag.
 */
export function useCreateTag() {
	const { invalidateTagsData } = useInvalidateTags();

	const createTagMutation = useMutation({
		mutationFn: tagService.createTag,
		onSuccess: invalidateTagsData
	});

	return {
		createTag: createTagMutation.mutate,
		createTagLoading: createTagMutation.isPending
	};
}

