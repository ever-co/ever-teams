'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { commentService } from '@/core/services/client/api/comments';
import { useCommentFileAttacher } from '@/core/hooks/documents/use-entity-files';
import { taskDiscussionScope, toTaskCommentItem } from '@/core/lib/utils/task-discussion';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { ICommentCreateInput } from '@/core/types/interfaces/common/comment';
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
		isPosting: createComment.isPending
	};
}
