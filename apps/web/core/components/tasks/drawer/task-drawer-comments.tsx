'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import moment from 'moment';
import { toast } from 'sonner';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { CircleCheck, MoreHorizontal, Pencil, RotateLeft, Trash } from '@/core/components/icons';
import { isOwnComment, isTextChanged } from '@/core/lib/utils/comment-ownership';
import { useTaskComments } from '@/core/hooks/tasks/use-task-comments';
import { splitMentions, type MentionSegment } from '@/core/lib/utils/comment-mentions';
import type { TaskCommentItem } from '@/core/types/interfaces/task/task-discussion';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { EntityFileChips } from '@/core/components/common/entity-files/entity-file-chips';
import { useCanAttachFiles } from '@/core/hooks/documents/use-entity-files';
import type { TEntityFileLink } from '@/core/types/schemas/documents/entity-file.schema';
import { CommentComposer, type CommentSubmit } from './comment-composer';
import { useCommentActions, type CommentActions } from './comment-actions-context';
import { CommentReactions } from './comment-reactions';

/** The menu button under the pointer, or always there on a touch screen (no hover-only control). */
const COMMENT_MENU_BUTTON =
	'flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-[opacity,colors] hover:bg-foreground/5 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-hover/comment:opacity-100 group-focus-within/comment:opacity-100 data-[popup-open]:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-4';

const LINK_BUTTON =
	'w-fit rounded-md text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

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

/** "(edited)" after a comment whose text changed, its time in the tooltip. */
function EditedMarker({ editedAt }: Readonly<{ editedAt: Date }>) {
	const t = useTranslations();
	const when = moment(editedAt).format('LLL');
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={300}>
				<span className="shrink-0 cursor-default text-xs text-muted-foreground" tabIndex={0}>
					{t('taskComments.EDITED')}
				</span>
			</TooltipTrigger>
			<TooltipContent>{t('taskComments.EDITED_AT', { date: when })}</TooltipContent>
		</Tooltip>
	);
}

/** The reader's own comment's menu: edit, delete, and on a thread's first comment resolve or reopen. */
function OwnCommentMenu({
	comment,
	isThreadStart,
	actions
}: Readonly<{ comment: TaskCommentItem; isThreadStart: boolean; actions: CommentActions }>) {
	const t = useTranslations();
	const remove = async () => {
		const deleted = await actions.deleteComment(comment.id);
		if (!deleted) {
			toast.error(t('taskComments.DELETE_FAILED'));
			return;
		}
		toast(t('taskComments.DELETED'), {
			action: {
				label: t('taskComments.UNDO'),
				onClick: () => {
					void deleted.undo().then((isRestored) => {
						if (!isRestored) toast.error(t('taskComments.RESTORE_FAILED'));
					});
				}
			}
		});
	};
	const toggleResolved = async () => {
		const isSaved = await actions.setThreadResolved(comment.id, !comment.resolved);
		if (!isSaved) toast.error(t('taskComments.SAVE_FAILED'));
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type="button" className={COMMENT_MENU_BUTTON} aria-label={t('taskComments.ACTIONS')}>
					<MoreHorizontal />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuItem onClick={() => actions.setEditingId(comment.id)}>
					<Pencil /> {t('taskComments.EDIT')}
				</DropdownMenuItem>
				{isThreadStart && (
					<DropdownMenuItem onClick={() => void toggleResolved()}>
						{comment.resolved ? <RotateLeft /> : <CircleCheck />}
						{comment.resolved ? t('taskComments.REOPEN') : t('taskComments.RESOLVE')}
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onClick={() => void remove()}>
					<Trash /> {t('taskComments.DELETE')}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** The comment's text turned into the comment field: Save keeps the change, Cancel or Escape drops it. */
function CommentEditor({ comment, actions }: Readonly<{ comment: TaskCommentItem; actions: CommentActions }>) {
	const t = useTranslations();
	const [isSaving, setIsSaving] = useState(false);
	const save: CommentSubmit = async (body, mentionEmployeeIds) => {
		if (!isTextChanged(comment.body, body)) {
			actions.setEditingId(null);
			return true;
		}
		setIsSaving(true);
		const isSaved = await actions.editComment(comment.id, body, mentionEmployeeIds);
		setIsSaving(false);
		if (!isSaved) {
			toast.error(t('taskComments.SAVE_FAILED'));
			return false;
		}
		actions.setEditingId(null);
		return true;
	};
	return (
		<CommentComposer
			autoFocus
			initialBody={comment.body}
			placeholder={t('taskComments.EDIT_PLACEHOLDER')}
			submitLabel={t('common.SAVE')}
			onSubmit={save}
			onCancel={() => actions.setEditingId(null)}
			isPosting={isSaving}
		/>
	);
}

function CommentBody({
	comment,
	names,
	filesOf,
	onReply,
	isThreadStart = false
}: Readonly<{
	comment: TaskCommentItem;
	names: string[];
	filesOf: CommentFilesOf;
	onReply?: () => void;
	isThreadStart?: boolean;
}>) {
	const t = useTranslations();
	const actions = useCommentActions();
	const files = filesOf(comment.id);
	const hasFiles = files.length > 0;
	const authorName = comment.authorName || t('taskDrawer.SOMEONE');
	const postedAgo = moment(comment.createdAt).fromNow();
	const isOwn = actions ? isOwnComment(comment, actions.reader) : false;
	const isEditing = isOwn && actions?.editingId === comment.id;
	return (
		<div className="group/comment flex gap-3">
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
					{comment.editedAt && <EditedMarker editedAt={comment.editedAt} />}
					{isOwn && actions && !isEditing && (
						<span className="ml-auto self-center">
							<OwnCommentMenu comment={comment} isThreadStart={isThreadStart} actions={actions} />
						</span>
					)}
				</div>
				{isEditing && actions ? (
					<CommentEditor comment={comment} actions={actions} />
				) : (
					<CommentText text={comment.body} names={names} />
				)}
				{hasFiles && <EntityFileChips links={files} />}
				{!isEditing && <CommentReactions commentId={comment.id} />}
				{onReply && !isEditing && (
					<button type="button" onClick={onReply} className={LINK_BUTTON}>
						{t('taskDrawer.REPLY')}
					</button>
				)}
			</div>
		</div>
	);
}

/** A resolved thread folded to one line: who resolved it, its replies, Show and (for its author) Reopen. */
function ResolvedThreadLine({ thread, onShow }: Readonly<{ thread: CommentThread; onShow: () => void }>) {
	const t = useTranslations();
	const actions = useCommentActions();
	const comment = thread.comment;
	const isOwn = actions ? isOwnComment(comment, actions.reader) : false;
	const resolver = comment.resolvedByName || t('taskDrawer.SOMEONE');
	const reopen = async () => {
		const isSaved = await actions?.setThreadResolved(comment.id, false);
		if (!isSaved) toast.error(t('taskComments.SAVE_FAILED'));
	};
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-foreground/[0.03] px-3 py-2 text-xs text-muted-foreground">
			<CircleCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
			<span className="min-w-0 truncate">
				{t('taskComments.RESOLVED_BY', { name: resolver })}
				{' · '}
				<span className="text-foreground">{comment.authorName || t('taskDrawer.SOMEONE')}</span>
				{thread.replies.length > 0 && <> · {t('taskComments.REPLIES', { count: thread.replies.length })}</>}
			</span>
			<span className="ml-auto flex shrink-0 items-center gap-3">
				<button type="button" onClick={onShow} className={LINK_BUTTON}>
					{t('taskComments.SHOW')}
				</button>
				{isOwn && (
					<button type="button" onClick={() => void reopen()} className={LINK_BUTTON}>
						{t('taskComments.REOPEN')}
					</button>
				)}
			</span>
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
	const [showsResolved, setShowsResolved] = useState(false);
	const hasReplies = thread.replies.length > 0;
	const showsReplyColumn = hasReplies || isReplying;
	const isFolded = thread.comment.resolved && !showsResolved && !isReplying;

	const postReply = async (body: string, mentionEmployeeIds: string[], files: File[]) => {
		const isSaved = await onPostReply(body, mentionEmployeeIds, files);
		if (isSaved) {
			onCancelReply();
		}
		return isSaved;
	};

	if (isFolded) {
		return (
			<li className="flex flex-col gap-3">
				<ResolvedThreadLine thread={thread} onShow={() => setShowsResolved(true)} />
			</li>
		);
	}

	return (
		<li className="flex flex-col gap-3">
			{thread.comment.resolved && (
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<CircleCheck className="size-3.5 text-primary" aria-hidden="true" />
					<span>
						{t('taskComments.RESOLVED_BY', {
							name: thread.comment.resolvedByName || t('taskDrawer.SOMEONE')
						})}
					</span>
					<button type="button" onClick={() => setShowsResolved(false)} className={LINK_BUTTON}>
						{t('taskComments.HIDE')}
					</button>
				</div>
			)}
			<CommentBody comment={thread.comment} names={names} filesOf={filesOf} onReply={onReply} isThreadStart />
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
