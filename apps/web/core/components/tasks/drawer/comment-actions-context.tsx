'use client';

import { createContext, useContext } from 'react';
import type { CommentReader } from '@/core/lib/utils/comment-ownership';
import type { DeletedComment } from '@/core/hooks/tasks/use-task-comments';
import type { IReactionSummary } from '@/core/types/interfaces/common/reaction';

/**
 * What a comment thread may do besides replying: the reader's own comments can be edited, deleted and (a thread's
 * first comment) resolved; every comment can be reacted to when reactions are on. Provided once per comment list, so
 * each comment reads it without the props going through every row.
 */
export interface CommentActions {
	reader: CommentReader;
	/** The comment whose text is being edited, if any (one at a time). */
	editingId: string | null;
	setEditingId: (commentId: string | null) => void;
	editComment: (commentId: string, body: string, mentionEmployeeIds: string[]) => Promise<boolean>;
	deleteComment: (commentId: string) => Promise<DeletedComment | null>;
	setThreadResolved: (commentId: string, resolved: boolean) => Promise<boolean>;
	reactions: {
		isAvailable: boolean;
		byComment: Map<string, IReactionSummary[]>;
		toggle: (commentId: string, emoji: string) => Promise<boolean>;
		canReact: boolean;
	};
}

const CommentActionsContext = createContext<CommentActions | null>(null);

export const CommentActionsProvider = CommentActionsContext.Provider;

/** The actions of the list a comment is in, or `null` where a list offers none (replying only). */
export function useCommentActions(): CommentActions | null {
	return useContext(CommentActionsContext);
}
