import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';

/**
 * Hook for reading tags data.
 *
 * @returns Object containing:
 * - `tags` — memoized array of tags (stable reference)
 * - `loading` — loading state
 */
export function useTagsQuery() {
	const tagsQuery = useQuery({
		queryKey: queryKeys.tags.all,
		queryFn: tagService.getTags
	});

	const tags = useMemo(() => tagsQuery.data?.items ?? [], [tagsQuery.data?.items]);

	return {
		tags,
		loading: tagsQuery.isLoading
	};
}

