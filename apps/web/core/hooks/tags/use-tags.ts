import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsState } from '@/core/stores/tags/tags';
import { tagService } from '@/core/services/client/api';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { useCallback } from 'react';

export const useTags = () => {
	const [tags, setTags] = useAtom(tagsState);
	const queryClient = useQueryClient();

	const tagsQuery = useQuery({
		queryKey: queryKeys.tags.all,
		queryFn: tagService.getTags
	});
	const invalidateTagsData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.tags.all }),
		[queryClient]
	);
	const createTagMutation = useMutation({
		mutationFn: tagService.createTag,
		onSuccess: invalidateTagsData
	});

	const updateTagMutation = useMutation({
		mutationFn: tagService.updateTag,
		onSuccess: invalidateTagsData
	});

	const deleteTagMutation = useMutation({
		mutationFn: tagService.deleteTag,
		onSuccess: invalidateTagsData
	});

	useConditionalUpdateEffect(
		() => {
			if (tagsQuery.data) {
				setTags(tagsQuery.data.items);
			}
		},
		[tagsQuery.data],
		Boolean(tags?.length)
	);

	return {
		tags,
		loading: tagsQuery.isLoading,
		getTags: invalidateTagsData,

		createTag: createTagMutation.mutate,
		createTagLoading: createTagMutation.isPending,

		updateTag: updateTagMutation.mutate,
		updateTagLoading: updateTagMutation.isPending,

		deleteTag: deleteTagMutation.mutate,
		deleteTagLoading: deleteTagMutation.isPending
	};
};
