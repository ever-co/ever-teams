'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { commentService } from '@/core/services/client/api/comments';
import { docsService } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { anchorsByComment } from '@/core/lib/utils/docs-comment-anchors';
import { docsCommentThreads, parseBlockAnchor, withBlockAnchor, type DocsCommentThread } from '@/core/lib/utils/docs-comments';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { IComment, ICommentCreateInput, ICommentUpdateInput } from '@/core/types/interfaces/common/comment';
import type { IDocumentCommentAnchorInput, IDocumentCommentAnchorResolved } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

const NO_COMMENTS: IComment[] = [];
const NO_ANCHORS: IDocumentCommentAnchorResolved[] = [];
/** The platform's answer for a comment that is not one of the page's (the route exists). */
const DOCS_COMMENT_NOT_FOUND = 'DOCS_COMMENT_NOT_FOUND';

interface DocsCommentPost {
	body: string;
	/** The block the thread is on; null for a comment on the page. A reply takes its thread's. */
	blockId: string | null;
	parentId?: string | null;
	mentionEmployeeIds?: string[];
	/** The text the new thread is on (a range of its block); a reply has none (it is on its thread's place). */
	range?: IDocumentCommentAnchorInput | null;
}

/** The page's comment ranges, or that the platform has none (404: its comments are on their blocks). */
interface AnchorsAnswer {
	supported: boolean;
	items: IDocumentCommentAnchorResolved[];
}

function isNotFound(error: unknown): boolean {
	return ApiErrorService.isApiError(error) && (error.statusCode === 404 || error.isEndpointUnavailable());
}

/**
 * A page's comments: the platform's comments on entity `Document` (threads on a block carry its anchor in their first
 * line), with posting, replying, editing, resolving and removing. Mentions and the page's followers reach the Inbox
 * through the platform (its mention service and its follower fan-out); the page title rides along for their text.
 *
 * A thread made on selected text also gets its range (`PUT …/comments/:commentId/anchor`) right after it is posted,
 * and the ranges of the page's threads are read beside the comments. A platform without ranges (404) keeps every
 * thread on its block, silently.
 */
export function useDocsComments(page: { id: string; name?: string | null } | null, enabled: boolean) {
	const queryClient = useQueryClient();
	const scope = useDocsScope();
	const pageId = page?.id ?? null;
	const pageName = page?.name ?? null;
	const key = queryKeys.docs.comments(scope?.tenantId, scope?.organizationId, pageId);
	const anchorsKey = queryKeys.docs.commentAnchors(scope?.tenantId, scope?.organizationId, pageId);
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

	// A platform that answered 404 once has no ranges: it is not asked again while the page is open.
	const anchorsOffRef = useRef(false);
	const anchorsQuery = useQuery({
		queryKey: anchorsKey,
		queryFn: async ({ signal }): Promise<AnchorsAnswer> => {
			if (!pageId || anchorsOffRef.current) return { supported: false, items: NO_ANCHORS };
			try {
				const list = await docsService.commentAnchors(pageId, signal);
				return { supported: true, items: Array.isArray(list?.items) ? list.items : NO_ANCHORS };
			} catch (error) {
				if (isNotFound(error)) {
					anchorsOffRef.current = true;
					return { supported: false, items: NO_ANCHORS };
				}
				throw error;
			}
		},
		enabled: isEnabled,
		staleTime: 0,
		retry: false
	});
	// Ranges that could not be read leave the threads on their blocks.
	const anchorItems = anchorsQuery.data?.items ?? NO_ANCHORS;
	const anchors = useMemo(() => anchorsByComment(anchorItems), [anchorItems]);
	const anchorsSupported = anchorsQuery.data?.supported ?? false;

	// The comments' key holds the ranges' too: both are read again.
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

	/**
	 * The range of a thread just posted. Never in the way of the comment: a platform without ranges (404) is not asked
	 * again, and any other refusal leaves the thread on its block (its first line names it).
	 */
	const placeRange = useCallback(
		async (commentId: string, range: IDocumentCommentAnchorInput) => {
			if (!pageId || anchorsOffRef.current) return;
			try {
				await docsService.setCommentAnchor(pageId, commentId, range);
			} catch (error) {
				// A 404 that names no comment is a platform without the route.
				const code = ApiErrorService.isApiError(error) ? error.errorCode : undefined;
				if (isNotFound(error) && code !== DOCS_COMMENT_NOT_FOUND) anchorsOffRef.current = true;
			} finally {
				void queryClient.invalidateQueries({ queryKey: anchorsKey });
			}
		},
		[anchorsKey, pageId, queryClient]
	);

	const post = useCallback(
		async ({ body, blockId, parentId, mentionEmployeeIds = [], range = null }: DocsCommentPost): Promise<IComment | null> => {
			const text = body.trim();
			if (!scope || !pageId || text.length === 0) return null;
			const input: ICommentCreateInput = {
				// The block's line stays: clients that know no ranges place the thread by it.
				comment: withBlockAnchor(blockId, text),
				entity: EBaseEntityEnum.Document,
				entityId: pageId,
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				...(pageName ? { entityName: pageName } : {}),
				...(parentId ? { parentId } : {}),
				...(mentionEmployeeIds.length > 0 ? { mentionEmployeeIds } : {})
			};
			const created = await createAsync(input);
			if (created?.id && range && !parentId && range.blockId === blockId) await placeRange(String(created.id), range);
			return created;
		},
		[createAsync, pageName, pageId, placeRange, scope]
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
		/** The ranges of the page's threads, by their first comment (none on a platform without ranges). */
		anchors,
		/** The platform keeps ranges: a thread made on selected text gets one. */
		anchorsSupported,
		/** The ranges were read, or will not be (a link to a thread can bring its text into sight). */
		anchorsSettled: isEnabled && !anchorsQuery.isPending,
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
