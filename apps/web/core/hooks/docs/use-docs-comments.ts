'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { commentService } from '@/core/services/client/api/comments';
import { docsCommentThreads, parseBlockAnchor, withBlockAnchor, type DocsCommentThread } from '@/core/lib/utils/docs-comments';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { IComment, ICommentCreateInput, ICommentUpdateInput } from '@/core/types/interfaces/common/comment';
import { useDocsScope } from './use-docs-scope';

const NO_COMMENTS: IComment[] = [];

export interface DocsCommentPost {
	body: string;
	/** The block the thread is on; null for a comment on the page. A reply takes its thread's. */
	blockId: string | null;
	parentId?: string | null;
	mentionEmployeeIds?: string[];
}

/**
 * A page's comments: the platform's comments on entity `Document` (threads on a block carry its anchor in their first
 * line), with posting, replying, editing, resolving and removing. Mentions and the page's followers reach the Inbox
 * through the platform (its mention service and its follower fan-out); the page title rides along for their text.
 */
export function useDocsComments(page: { id: string; name?: string | null } | null, enabled: boolean) {
	const queryClient = useQueryClient();
	const scope = useDocsScope();
	const pageId = page?.id ?? null;
	const pageName = page?.name ?? null;
	const key = queryKeys.docs.comments(scope?.tenantId, scope?.organizationId, pageId);
	const isEnabled = enabled && scope !== null && pageId !== null;

	const query = useQuery({
		queryKey: key,
		queryFn: async ({ signal }) => {
			if (!scope || !pageId) return NO_COMMENTS;
			const result = await commentService.getAll(EBaseEntityEnum.Document, pageId, { tenantId: scope.tenantId, organizationId: scope.organizationId }, signal);
			return result.items;
		},
		enabled: isEnabled,
		// Others comment too: the panel reads the threads again when it opens.
		staleTime: 0,
		retry: false
	});
	const comments = query.data ?? NO_COMMENTS;
	const threads = useMemo<DocsCommentThread[]>(() => docsCommentThreads(comments), [comments]);

	const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [key, queryClient]);

	const create = useMutation({
		mutationFn: (input: ICommentCreateInput) => commentService.create(input),
		onSettled: () => refresh()
	});
	const update = useMutation({
		mutationFn: ({ id, input }: { id: string; input: ICommentUpdateInput }) => commentService.update(id, input),
		onSettled: () => refresh()
	});
	const remove = useMutation({
		mutationFn: (id: string) => commentService.remove(id),
		onSettled: () => refresh()
	});
	const { mutateAsync: createAsync } = create;
	const { mutateAsync: updateAsync } = update;
	const { mutateAsync: removeAsync } = remove;

	const post = useCallback(
		async ({ body, blockId, parentId, mentionEmployeeIds = [] }: DocsCommentPost): Promise<IComment | null> => {
			const text = body.trim();
			if (!scope || !pageId || text.length === 0) return null;
			const input: ICommentCreateInput = {
				comment: withBlockAnchor(blockId, text),
				entity: EBaseEntityEnum.Document,
				entityId: pageId,
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				...(pageName ? { entityName: pageName } : {}),
				...(parentId ? { parentId } : {}),
				...(mentionEmployeeIds.length > 0 ? { mentionEmployeeIds } : {})
			};
			return await createAsync(input);
		},
		[createAsync, pageName, pageId, scope]
	);

	/** A new text for a comment; its anchor stays. The mentions are left as they were. */
	const edit = useCallback(
		async (comment: IComment, body: string) => {
			const text = body.trim();
			if (text.length === 0) return null;
			return await updateAsync({ id: String(comment.id), input: { comment: withBlockAnchor(parseBlockAnchor(comment.comment).blockId, text) } });
		},
		[updateAsync]
	);

	/** Closes or opens again a thread (its first comment). The time is cleared on a reopen: the platform does not. */
	const setResolved = useCallback(
		(comment: IComment, resolved: boolean) =>
			updateAsync({ id: String(comment.id), input: { resolved, resolvedAt: resolved ? new Date().toISOString() : null } }),
		[updateAsync]
	);

	const removeComment = useCallback((comment: IComment) => removeAsync(String(comment.id)), [removeAsync]);

	return {
		comments,
		threads,
		isLoading: isEnabled && query.isPending,
		/** The comments were read (a thread a link asks for can be looked for). */
		isReady: isEnabled && query.isSuccess,
		isError: isEnabled && query.isError,
		refresh,
		post,
		edit,
		setResolved,
		remove: removeComment,
		isPosting: create.isPending,
		isUpdating: update.isPending || remove.isPending
	};
}

export type DocsCommentsState = ReturnType<typeof useDocsComments>;
