import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../common/use-query';
import cloneDeep from 'lodash/cloneDeep';
import { tagsState } from '@/core/stores/tags/tags';
import { ITag } from '@/core/types/interfaces/tag/ITag';
import { tagService } from '@/core/services/client/api';

export const useTags = () => {
	const [tags, setTags] = useAtom(tagsState);

	const { loading, queryCall: getTagsQueryCall } = useQuery(tagService.getTags);
	const { loading: createTagLoading, queryCall: createTagQueryCall } = useQuery(tagService.createTag);
	const { loading: updateTagLoading, queryCall: updateTagQueryCall } = useQuery(tagService.updateTag);
	const { loading: deleteTagLoading, queryCall: deleteTagQueryCall } = useQuery(tagService.deleteTag);

	const getTags = useCallback(() => {
		getTagsQueryCall().then((response) => {
			if (response?.data?.items?.length) {
				setTags(response.data.items);
			}
		});
	}, [getTagsQueryCall, setTags]);

	const createTag = useCallback(
		async (tag: Omit<ITag, 'id'>) => {
			return createTagQueryCall(tag).then((response) => {
				setTags((prevTags) => [response.data, ...prevTags]);
			});
		},
		[createTagQueryCall, setTags]
	);

	const updateTag = useCallback(
		async (tag: ITag) => {
			updateTagQueryCall(tag).then(() => {
				const index = tags.findIndex((item) => item.id === tag.id);
				const tempTags = cloneDeep(tags);
				if (index >= 0) {
					tempTags[index].name = tag.name;
				}

				setTags(tempTags);
			});
		},
		[tags, setTags, updateTagQueryCall]
	);

	const deleteTag = useCallback(
		async (id: string) => {
			deleteTagQueryCall(id).then(() => {
				setTags(tags.filter((tag) => tag.id !== id));
			});
		},
		[deleteTagQueryCall, setTags, tags]
	);

	return {
		tags,
		loading,
		getTags,

		createTag,
		createTagLoading,

		deleteTag,
		deleteTagLoading,

		updateTag,
		updateTagLoading
	};
};
