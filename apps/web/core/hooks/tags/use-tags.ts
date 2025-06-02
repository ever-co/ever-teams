import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsState } from '@/core/stores/tags/tags';
import { tagService } from '@/core/services/client/api';

export const useTags = () => {
	const [, setTags] = useAtom(tagsState);
	const queryClient = useQueryClient();

	const tagsQuery = useQuery({
		queryKey: ['tags'],
		queryFn: () =>
			tagService.getTags().then((response) => {
				setTags(response.items);
				return response;
			})
	});

	const createTagMutation = useMutation({
		mutationFn: tagService.createTag,
		onSuccess: (tag) => {
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	});

	const updateTagMutation = useMutation({
		mutationFn: tagService.updateTag,
		onSuccess: (tag) => {
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	});

	const deleteTagMutation = useMutation({
		mutationFn: tagService.deleteTag,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['tags'] });
		}
	});

	return {
		tags: tagsQuery.data?.items || [],
		loading: tagsQuery.isLoading,
		getTags: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),

		createTag: createTagMutation.mutate,
		createTagLoading: createTagMutation.isPending,

		updateTag: updateTagMutation.mutate,
		updateTagLoading: updateTagMutation.isPending,

		deleteTag: deleteTagMutation.mutate,
		deleteTagLoading: deleteTagMutation.isPending
	};
};
