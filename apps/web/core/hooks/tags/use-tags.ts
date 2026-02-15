import { useTagsQuery } from './use-tags-query';
import { useCreateTag } from './use-create-tag';
import { useUpdateTag } from './use-update-tag';
import { useDeleteTag } from './use-delete-tag';
import { useInvalidateTags } from './use-invalidate-tags';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useTagsQuery` for read operations
 * - `useCreateTag` for tag creation
 * - `useUpdateTag` for tag updates
 * - `useDeleteTag` for tag deletion
 * - `useInvalidateTags` for shared cache invalidation
 */
export const useTags = () => {
	const queryData = useTagsQuery();
	const createData = useCreateTag();
	const updateData = useUpdateTag();
	const deleteData = useDeleteTag();
	const { invalidateTagsData } = useInvalidateTags();

	return {
		tags: queryData.tags,
		loading: queryData.loading,
		getTags: invalidateTagsData,

		createTag: createData.createTag,
		createTagLoading: createData.createTagLoading,

		updateTag: updateData.updateTag,
		updateTagLoading: updateData.updateTagLoading,

		deleteTag: deleteData.deleteTag,
		deleteTagLoading: deleteData.deleteTagLoading
	};
};
