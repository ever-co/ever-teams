'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { commentService } from '@/core/services/client/api/comments';
import { useCommentFileAttacher } from '@/core/hooks/documents/use-entity-files';
import { taskDiscussionScope, toTaskCommentItem } from '@/core/lib/utils/task-discussion';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { ICommentCreateInput, ICommentResolveUpdate } from '@/core/types/interfaces/common/comment';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import { TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';

interface CommentedTask {
	id: string;
	title: string;
}

export interface CommentPostOptions {
	parentId?: string;
	mentionEmployeeIds?: string[];
	/** Attached once the comment exists; a failed attachment leaves the comment posted and says so. */
	files?: File[];
}

const NO_COMMENTS: TaskCommentItem[] = [];

/** A deleted comment: `undo` brings it back (the platform restores the withdrawn row). */
export interface DeletedComment {
	undo: () => Promise<boolean>;
}

/** The change a resolve or a reopen writes: the platform records the caller as the resolver. */
export function resolveUpdateOf(
	resolved: boolean,
	myEmployeeId: string | null,
	now: Date = new Date()
): ICommentResolveUpdate {
	if (!resolved) {
		return { resolved: false, resolvedAt: null, resolvedByEmployeeId: null };
	}
	return { resolved: true, resolvedAt: now.toISOString(), resolvedByEmployeeId: myEmployeeId };
}

/** The list without one comment: what the reader sees while its delete runs. */
export function withoutComment(comments: TaskCommentItem[] | undefined, commentId: string): TaskCommentItem[] {
	return (comments ?? NO_COMMENTS).filter((comment) => comment.id !== commentId);
}

/**
 * The list with one comment put back where it was, once the platform refused its delete: only that comment, so the
 * other deletes still running (or done) keep theirs. `before` is the list as it was when that delete started.
 */
export function withCommentRestored(
	current: TaskCommentItem[] | undefined,
	before: TaskCommentItem[] | undefined,
	commentId: string
): TaskCommentItem[] {
	const list = current ?? NO_COMMENTS;
	const restored = (before ?? NO_COMMENTS).find((comment) => comment.id === commentId);
	if (!restored || list.some((comment) => comment.id === commentId)) {
		return list;
	}
	// After the comments that came before it, so it goes back in its place whatever else changed meanwhile.
	const earlier = new Set<string>();
	for (const comment of before ?? NO_COMMENTS) {
		if (comment.id === commentId) break;
		earlier.add(comment.id);
	}
	let at = 0;
	list.forEach((comment, index) => {
		if (earlier.has(comment.id)) at = index + 1;
	});
	return [...list.slice(0, at), restored, ...list.slice(at)];
}

async function fetchTaskComments(
	taskId: string | null,
	scope: IEntityRecordScope | null,
	signal: AbortSignal
): Promise<TaskCommentItem[]> {
	if (!taskId || !scope) {
		return NO_COMMENTS;
	}
	const page = await commentService.getAll(EBaseEntityEnum.Task, taskId, scope, signal);

	return page.items.map(toTaskCommentItem);
}

/** The Gauzy UI's comment post: the task title rides along as `entityName` for the mention notifications. */
function commentInputOf(
	task: CommentedTask,
	body: string,
	scope: IEntityRecordScope,
	options: CommentPostOptions
): ICommentCreateInput | null {
	const comment = body.trim();
	if (comment.length === 0) {
		return null;
	}
	const input: ICommentCreateInput = {
		comment,
		entity: EBaseEntityEnum.Task,
		entityId: task.id,
		entityName: task.title,
		tenantId: scope.tenantId,
		organizationId: scope.organizationId
	};
	if (options.parentId) {
		input.parentId = options.parentId;
	}
	const mentionEmployeeIds = options.mentionEmployeeIds ?? [];
	if (mentionEmployeeIds.length > 0) {
		input.mentionEmployeeIds = mentionEmployeeIds;
	}

	return input;
}

/** A task's comments and replies, oldest first, with a poster that re-reads the list once a comment is saved. */
export function useTaskComments(task: CommentedTask | null) {
	const queryClient = useQueryClient();
	const scope = taskDiscussionScope();
	const taskId = task?.id ?? null;
	const isEnabled = scope !== null && taskId !== null;

	const commentsQuery = useQuery({
		queryKey: queryKeys.taskComments.byTask(scope?.tenantId, scope?.organizationId, taskId),
		queryFn: ({ signal }) => fetchTaskComments(taskId, scope, signal),
		enabled: isEnabled,
		// Others comment too: opening the drawer again re-reads the thread behind the cached one.
		staleTime: 0
	});

	const createComment = useMutation({
		mutationFn: (input: ICommentCreateInput) => commentService.create(input),
		// The create response carries no author relation: the list is read again, and the post resolves after it.
		onSuccess: (_comment, input) =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.taskComments.byTask(input.tenantId, input.organizationId, input.entityId)
			})
	});
	const { mutateAsync } = createComment;
	const attachCommentFiles = useCommentFileAttacher();

	const postComment = useCallback(
		async (body: string, options: CommentPostOptions = {}): Promise<boolean> => {
			const postScope = taskDiscussionScope();
			if (!task || !postScope) {
				return false;
			}
			const input = commentInputOf(task, body, postScope, options);
			if (!input) {
				return false;
			}
			let created: Awaited<ReturnType<typeof mutateAsync>>;
			try {
				created = await mutateAsync(input);
			} catch {
				return false;
			}
			const files = options.files ?? [];
			const hasFiles = files.length > 0;
			const createdId = created?.id;
			if (hasFiles && createdId) {
				await attachCommentFiles(createdId, task.id, files);
			}

			return true;
		},
		[attachCommentFiles, mutateAsync, task]
	);

	const scopeTenantId = scope?.tenantId;
	const scopeOrganizationId = scope?.organizationId;
	const commentsKeyOf = useCallback(
		() => queryKeys.taskComments.byTask(scopeTenantId, scopeOrganizationId, taskId),
		[scopeOrganizationId, scopeTenantId, taskId]
	);
	// The reactions sit under the comments' key and are read again too, but a comment action waits for the comments
	// alone: a slow reaction read never keeps Save or Reopen pending.
	const refreshComments = useCallback(async () => {
		void queryClient.invalidateQueries({
			queryKey: queryKeys.taskComments.reactionsByTask(scopeTenantId, scopeOrganizationId, taskId)
		});
		await queryClient.invalidateQueries({ queryKey: commentsKeyOf(), exact: true });
	}, [commentsKeyOf, queryClient, scopeOrganizationId, scopeTenantId, taskId]);

	/**
	 * Changes the text of a comment of the caller's own; `false` when the platform refused it. `mentionEmployeeIds`
	 * replaces the comment's mentions; left out, they stay as stored (an edit that changes no mention).
	 */
	const editComment = useCallback(
		async (commentId: string, body: string, mentionEmployeeIds?: string[]): Promise<boolean> => {
			const editScope = taskDiscussionScope();
			const comment = body.trim();
			if (!editScope || comment.length === 0) {
				return false;
			}
			try {
				await commentService.update(
					commentId,
					mentionEmployeeIds ? { comment, mentionEmployeeIds } : { comment },
					editScope
				);
			} catch {
				return false;
			}
			await refreshComments();
			return true;
		},
		[refreshComments]
	);

	/**
	 * Deletes a comment of the caller's own (the platform withdraws it): it leaves the list at once, and comes back if
	 * the platform refuses. Answers the undo, or `null` when the delete failed.
	 */
	const deleteComment = useCallback(
		async (commentId: string): Promise<DeletedComment | null> => {
			const deleteScope = taskDiscussionScope();
			if (!deleteScope) {
				return null;
			}
			const key = commentsKeyOf();
			await queryClient.cancelQueries({ queryKey: key });
			const previous = queryClient.getQueryData<TaskCommentItem[]>(key);
			queryClient.setQueryData<TaskCommentItem[]>(key, (current) => withoutComment(current, commentId));
			try {
				await commentService.softDelete(commentId, deleteScope);
			} catch {
				// Only this comment comes back: another delete running meanwhile keeps its own hidden. The list is read
				// again, so it ends as the platform has it.
				queryClient.setQueryData<TaskCommentItem[]>(key, (current) =>
					withCommentRestored(current, previous, commentId)
				);
				void refreshComments();
				return null;
			}
			void refreshComments();
			return {
				undo: async () => {
					try {
						await commentService.recover(commentId, deleteScope);
					} catch {
						return false;
					}
					await refreshComments();
					return true;
				}
			};
		},
		[commentsKeyOf, queryClient, refreshComments]
	);

	/** Resolves or reopens a thread (its first comment); `false` when the platform refused it. */
	const setThreadResolved = useCallback(
		async (commentId: string, resolved: boolean, myEmployeeId: string | null): Promise<boolean> => {
			const resolveScope = taskDiscussionScope();
			if (!resolveScope) {
				return false;
			}
			try {
				await commentService.setResolved(commentId, resolveUpdateOf(resolved, myEmployeeId), resolveScope);
			} catch {
				return false;
			}
			await refreshComments();
			return true;
		},
		[refreshComments]
	);

	const { refetch: refetchComments } = commentsQuery;
	const refetch = useCallback(() => {
		if (!isEnabled) {
			return;
		}
		void refetchComments();
	}, [isEnabled, refetchComments]);

	const comments = commentsQuery.data ?? NO_COMMENTS;

	return {
		comments,
		isLoading: commentsQuery.isLoading,
		isError: commentsQuery.isError,
		refetch,
		postComment,
		isPosting: createComment.isPending,
		editComment,
		deleteComment,
		setThreadResolved
	};
}
