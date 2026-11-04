'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import moment from 'moment';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { useTaskComments } from '@/core/hooks/tasks/use-task-comments';
import { splitMentions, type MentionSegment } from '@/core/lib/utils/comment-mentions';
import type { TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { EntityFileChips } from '@/core/components/common/entity-files/entity-file-chips';
import { useCanAttachFiles } from '@/core/hooks/documents/use-entity-files';
import type { TEntityFileLink } from '@/core/types/schemas/documents/entity-file.schema';
import { CommentComposer, type CommentSubmit } from './comment-composer';

export interface CommentThread {
	comment: TaskCommentItem;
	replies: TaskCommentItem[];
}

const SKELETON_KEYS = ['comment-1', 'comment-2', 'comment-3'];

type CommentFilesOf = (commentId: string) => TEntityFileLink[];

/** Replies are one level deep; a reply whose parent is gone stands as a comment of its own (the Gauzy UI's rule). */
export function threadsOf(comments: TaskCommentItem[]): CommentThread[] {
	const ids = new Set(comments.map((comment) => comment.id));
	const threads: CommentThread[] = [];
	const repliesByParent = new Map<string, TaskCommentItem[]>();
	for (const comment of comments) {
		const parentId = comment.parentId;
		const isReply = Boolean(parentId) && ids.has(parentId as string);
		if (!isReply) {
			threads.push({ comment, replies: [] });
			continue;
		}
		const siblings = repliesByParent.get(parentId as string) ?? [];
		siblings.push(comment);
		repliesByParent.set(parentId as string, siblings);
	}
	for (const thread of threads) {
		thread.replies = repliesByParent.get(thread.comment.id) ?? [];
	}
	return threads;
}

/** A mention of a known person reads as a chip in the brand ink, the rest as written. */
function CommentText({ text, names }: Readonly<{ text: string; names: string[] }>) {
	const segments = useMemo(() => splitMentions(text, names), [text, names]);
	return (
		<p className="text-[13px] leading-5 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
			{segments.map((segment, index) => (
				<CommentSegment key={`${index}-${segment.text}`} segment={segment} />
			))}
		</p>
	);
}

function CommentSegment({ segment }: Readonly<{ segment: MentionSegment }>) {
	if (segment.isMention) {
		return (
			<span className="rounded-[4px] bg-primary/10 px-0.5 font-medium text-primary-ink dark:bg-primary/20">
				{segment.text}
			</span>
		);
	}
	return <>{segment.text}</>;
}

function CommentBody({
	comment,
	names,
	filesOf,
	onReply
}: Readonly<{ comment: TaskCommentItem; names: string[]; filesOf: CommentFilesOf; onReply?: () => void }>) {
	const t = useTranslations();
	const files = filesOf(comment.id);
	const hasFiles = files.length > 0;
	const authorName = comment.authorName || t('taskDrawer.SOMEONE');
	const postedAgo = moment(comment.createdAt).fromNow();
	return (
		<div className="flex gap-3">
			<PersonAvatar
				person={{ id: comment.id, name: authorName, imageUrl: comment.authorImageUrl }}
				className="size-6 text-[10px] ring-0"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-baseline gap-2">
					<span className="truncate text-[13px] font-medium text-foreground">{authorName}</span>
					<time dateTime={comment.createdAt.toISOString()} className="shrink-0 text-xs text-muted-foreground">
						{postedAgo}
					</time>
				</div>
				<CommentText text={comment.body} names={names} />
				{hasFiles && <EntityFileChips links={files} />}
				{onReply && (
					<button
						type="button"
						onClick={onReply}
						className="w-fit rounded-md text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{t('taskDrawer.REPLY')}
					</button>
				)}
			</div>
		</div>
	);
}

export function CommentThreadView({
	thread,
	names,
	filesOf,
	canAttach,
	isReplying,
	onReply,
	onCancelReply,
	onPostReply,
	isPosting
}: Readonly<{
	thread: CommentThread;
	names: string[];
	filesOf: CommentFilesOf;
	canAttach: boolean;
	isReplying: boolean;
	onReply: () => void;
	onCancelReply: () => void;
	onPostReply: CommentSubmit;
	isPosting: boolean;
}>) {
	const t = useTranslations();
	const hasReplies = thread.replies.length > 0;
	const showsReplyColumn = hasReplies || isReplying;

	const postReply = async (body: string, mentionEmployeeIds: string[], files: File[]) => {
		const isSaved = await onPostReply(body, mentionEmployeeIds, files);
		if (isSaved) {
			onCancelReply();
		}
		return isSaved;
	};

	return (
		<li className="flex flex-col gap-3">
			<CommentBody comment={thread.comment} names={names} filesOf={filesOf} onReply={onReply} />
			{showsReplyColumn && (
				<div className="ml-3 flex flex-col gap-3 hairline-l border-dashed border-border pl-6">
					{thread.replies.map((reply) => (
						<CommentBody key={reply.id} comment={reply} names={names} filesOf={filesOf} />
					))}
					{isReplying && (
						<CommentComposer
							autoFocus
							placeholder={t('taskDrawer.REPLY')}
							onSubmit={postReply}
							onCancel={onCancelReply}
							isPosting={isPosting}
							canAttach={canAttach}
						/>
					)}
				</div>
			)}
		</li>
	);
}

export function CommentsSkeleton() {
	return (
		<output className="flex flex-col gap-4">
			{SKELETON_KEYS.map((key) => (
				<span key={key} className="flex gap-3">
					<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<span className="flex flex-1 flex-col gap-2 pt-1">
						<span className="h-3 w-32 animate-pulse rounded-full bg-foreground/[0.06]" />
						<span className="h-3 w-4/5 animate-pulse rounded-full bg-foreground/[0.06]" />
					</span>
				</span>
			))}
		</output>
	);
}

/** The comment field pinned at the foot of the drawer while the Comments tab is open (favorite-0's layout). */
export function TaskCommentComposer({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const taskRef = useMemo(() => ({ id: task.id, title: task.title }), [task.id, task.title]);
	const { postComment, isPosting } = useTaskComments(taskRef);
	const canAttach = useCanAttachFiles({ entity: 'Task', entityId: task.id });
	return (
		<CommentComposer
			placeholder={t('taskDrawer.ADD_COMMENT')}
			onSubmit={(body, mentionEmployeeIds, files) => postComment(body, { mentionEmployeeIds, files })}
			isPosting={isPosting}
			canAttach={canAttach}
		/>
	);
}
