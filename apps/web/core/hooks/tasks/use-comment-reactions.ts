'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { commentReactionService } from '@/core/services/client/api/comments';
import { isCommentReactionsEnabled } from '@/core/lib/utils/comments-trash-flags';
import { reactionsByComment, toggledReactions } from '@/core/lib/utils/comment-reactions';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { IReactionReactor, IReactionSummary } from '@/core/types/interfaces/common/reaction';

const NO_SUMMARIES: IReactionSummary[] = [];

interface ToggleVariables {
	commentId: string;
	emoji: string;
}

export interface CommentReactions {
	/** Whether reactions are shown: the flag is on and the platform answered the summary. */
	isAvailable: boolean;
	/** Each comment's reactions, in the order the emojis were first used. */
	byComment: Map<string, IReactionSummary[]>;
	/** Adds or takes back the caller's reaction; `false` when the platform refused it (the chips are put back). */
	toggle: (commentId: string, emoji: string) => Promise<boolean>;
}

/**
 * The reactions on a task's comments (`NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED`), read in one request per task under
 * the task's comments key, so a live `comment.*` hint or a new comment refetches them with the comments. A toggle shows
 * at once (the caller's chip changes before the platform answers) and is put back if the platform refuses it.
 *
 * @param taskId - The task, or `null` while it is not loaded (nothing is read).
 * @param me - The caller as a reactor; without an employee the caller cannot react (the platform refuses it).
 */
export function useCommentReactions(taskId: string | null, me: IReactionReactor | null): CommentReactions {
	const queryClient = useQueryClient();
	const scope = taskDiscussionScope();
	const isFlagOn = isCommentReactionsEnabled();
	const queryKey = queryKeys.taskComments.reactionsByTask(scope?.tenantId, scope?.organizationId, taskId);
	const isEnabled = isFlagOn && scope !== null && taskId !== null;

	const reactionsQuery = useQuery({
		queryKey,
		queryFn: ({ signal }) =>
			scope && taskId
				? commentReactionService.getForRecord(EBaseEntityEnum.Task, taskId, scope, signal)
				: Promise.resolve(NO_SUMMARIES),
		enabled: isEnabled,
		staleTime: 0,
		// A platform without the summary answers 404: reactions stay hidden, the comments are not held up.
		retry: false
	});

	const { mutateAsync } = useMutation({
		mutationFn: async ({ commentId, emoji }: ToggleVariables) => {
			const postScope = taskDiscussionScope();
			if (!postScope) throw new Error('No workspace scope to react in');
			await commentReactionService.toggle({ entity: 'Comment', entityId: commentId, emoji, ...postScope });
		},
		onMutate: async ({ commentId, emoji }: ToggleVariables) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<IReactionSummary[]>(queryKey);
			if (me) {
				queryClient.setQueryData<IReactionSummary[]>(queryKey, (current) =>
					toggledReactions(current ?? NO_SUMMARIES, commentId, emoji, me)
				);
			}
			return { previous };
		},
		onError: (_error, _variables, context) => {
			queryClient.setQueryData(queryKey, context?.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey })
	});

	const toggle = useCallback(
		async (commentId: string, emoji: string): Promise<boolean> => {
			if (!isEnabled || !me) return false;
			try {
				await mutateAsync({ commentId, emoji });
				return true;
			} catch {
				return false;
			}
		},
		[isEnabled, me, mutateAsync]
	);

	const data = reactionsQuery.data;
	const byComment = useMemo(() => reactionsByComment(data), [data]);
	const isAvailable = isEnabled && reactionsQuery.isSuccess;

	return useMemo(() => ({ isAvailable, byComment, toggle }), [byComment, isAvailable, toggle]);
}
