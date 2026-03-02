import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook providing shared cache invalidation logic for tags.
 */
export function useInvalidateTags() {
	const queryClient = useQueryClient();

	const invalidateTagsData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }),
		[queryClient]
	);

	return { invalidateTagsData, queryClient };
}

