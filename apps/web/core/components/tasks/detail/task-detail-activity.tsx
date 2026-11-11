'use client';

import { Fragment, useCallback, useMemo, useState, type ReactNode } from 'react';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { Calendar, ChevronUp, History, Pencil, Plus, Tag, Timer, Users } from '@/core/components/icons';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import {
	actionSentence,
	ActivitySkeleton,
	changeSentence,
	dayLabelOf,
	displayValueOf,
	fieldLabelOf
} from '@/core/components/tasks/drawer/task-drawer-activity';
import {
	CommentThreadView,
	CommentsSkeleton,
	TaskCommentComposer,
	threadsOf,
	type CommentThread
} from '@/core/components/tasks/drawer/task-drawer-comments';
import { TaskPropertyIcon, type TaskPropertyKind } from '@/core/components/tasks/task-property-icon';
import { useHasComeNear } from '@/core/hooks/common/use-has-come-near';
import { useCanAttachFiles, useTaskCommentFiles } from '@/core/hooks/documents/use-entity-files';
import { useMentionCandidates } from '@/core/hooks/tasks/use-mention-candidates';
import { useTaskActivityLog } from '@/core/hooks/tasks/use-task-activity-log';
import { useTaskComments } from '@/core/hooks/tasks/use-task-comments';
import { useCommentReactions } from '@/core/hooks/tasks/use-comment-reactions';
import { CommentActionsProvider, type CommentActions } from '@/core/components/tasks/drawer/comment-actions-context';
import { userState } from '@/core/stores';
import { cn } from '@/core/lib/helpers';
import type { TEntityFileLink } from '@/core/types/schemas/documents/entity-file.schema';
import type { TaskActivityChange, TaskActivityItem } from '@/core/types/interfaces/task/task-discussion';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_GHOST_ACTION } from './task-detail-recipes';
import { TaskDetailSection } from './task-detail-section';

type FeedFilter = 'all' | 'comments' | 'history';

type FeedItem =
	| { kind: 'comment'; id: string; date: Date; thread: CommentThread }
	| { kind: 'history'; id: string; date: Date; activity: TaskActivityItem };

interface FeedDay {
	key: string;
	date: Date;
	items: FeedItem[];
}

const VISIBLE_ITEMS = 20;

const NO_FILES: TEntityFileLink[] = [];

const PROPERTY_FIELDS: Record<string, TaskPropertyKind> = {
	status: 'status',
	taskStatusId: 'status',
	priority: 'priority',
	size: 'size',
	issueType: 'issueType'
};

function commentItemOf(thread: CommentThread): FeedItem {
	return { kind: 'comment', id: thread.comment.id, date: thread.comment.createdAt, thread };
}

function historyItemOf(activity: TaskActivityItem): FeedItem {
	return { kind: 'history', id: activity.id, date: activity.createdAt, activity };
}

function feedItemsOf(threads: CommentThread[], activities: TaskActivityItem[], filter: FeedFilter) {
	const items: FeedItem[] = [];
	if (filter !== 'history') {
		items.push(...threads.map(commentItemOf));
	}
	if (filter !== 'comments') {
		items.push(...activities.map(historyItemOf));
	}
	items.sort((first, second) => first.date.getTime() - second.date.getTime());
	return items;
}

function feedDaysOf(items: FeedItem[]): FeedDay[] {
	const days: FeedDay[] = [];
	for (const item of items) {
		const key = moment(item.date).format('YYYY-MM-DD');
		const lastDay = days.at(-1);
		const isSameDay = lastDay?.key === key;
		if (isSameDay) {
			lastDay.items.push(item);
			continue;
		}
		days.push({ key, date: item.date, items: [item] });
	}
	return days;
}

function HistoryGlyph({ change }: Readonly<{ change: TaskActivityChange | undefined }>): ReactNode {
	const field = change?.field ?? '';
	const propertyKind = PROPERTY_FIELDS[field];
	if (propertyKind) {
		return <TaskPropertyIcon kind={propertyKind} name={change?.to ?? undefined} className="size-3.5" />;
	}
	if (field === 'members') {
		return <Users className="size-3.5" />;
	}
	if (field === 'tags') {
		return <Tag className="size-3.5" />;
	}
	if (field === 'dueDate' || field === 'startDate') {
		return <Calendar className="size-3.5" />;
	}
	if (field === 'estimate') {
		return <Timer className="size-3.5" />;
	}
	if (field === 'title' || field === 'description') {
		return <Pencil className="size-3.5" />;
	}
	if (!change) {
		return <Plus className="size-3.5" />;
	}
	return <History className="size-3.5" />;
}

function ChangeValue({ change }: Readonly<{ change: TaskActivityChange }>) {
	const propertyKind = PROPERTY_FIELDS[change.field];
	const value = displayValueOf(change.field, change.to);
	if (!value) {
		return null;
	}
	return (
		<span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground">
			{propertyKind && (
				<TaskPropertyIcon kind={propertyKind} name={change.to ?? undefined} className="size-3.5" />
			)}
			<span className="truncate capitalize">{value}</span>
		</span>
	);
}

function HistoryEntry({ activity, connectsToNext }: Readonly<{ activity: TaskActivityItem; connectsToNext: boolean }>) {
	const t = useTranslations();
	const actorName = activity.actorName || t('taskDrawer.SOMEONE');
	const changes = activity.changes;
	const changeCount = changes.length;
	const hasSeveralChanges = changeCount > 1;
	const time = moment(activity.createdAt).format('HH:mm');

	let sentence = actionSentence(activity.action, t);
	if (changeCount === 1) {
		sentence = changeSentence(changes[0], t);
	}
	if (hasSeveralChanges) {
		sentence = t('taskDetail.activity.UPDATED_FIELDS', { count: changeCount });
	}

	return (
		<li className="relative flex gap-3">
			{connectsToNext && (
				<span
					aria-hidden="true"
					className="absolute top-7 -bottom-3 left-3 hairline-l border-dashed border-foreground/20"
				/>
			)}
			<span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground hairline-ring ring-border">
				<HistoryGlyph change={changes[0]} />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
				<p className="text-[13px] leading-5 text-muted-foreground">
					<span className="font-medium text-foreground">{actorName}</span> {sentence}
					<time dateTime={activity.createdAt.toISOString()} className="ml-1.5 text-xs tabular-nums">
						{time}
					</time>
				</p>
				{hasSeveralChanges && (
					<ul className="flex flex-col gap-1">
						{changes.map((change, index) => (
							<li
								key={`${change.field}-${index}`}
								className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground"
							>
								<span className="shrink-0">{fieldLabelOf(change.field, t)}</span>
								<span aria-hidden="true">→</span>
								<ChangeValue change={change} />
							</li>
						))}
					</ul>
				)}
			</div>
		</li>
	);
}

function countOrNothing(count: number) {
	if (count === 0) {
		return undefined;
	}
	return count;
}

function useFeedTabs(commentCount: number, historyCount: number) {
	const t = useTranslations();
	return useMemo<SegmentedControlItem<FeedFilter>[]>(() => {
		const tabs: SegmentedControlItem<FeedFilter>[] = [{ value: 'all', label: t('taskDetail.activity.ALL') }];
		tabs.push(
			{ value: 'comments', label: t('taskDrawer.COMMENTS'), count: countOrNothing(commentCount) },
			{ value: 'history', label: t('taskDetail.activity.HISTORY'), count: countOrNothing(historyCount) }
		);
		return tabs;
	}, [commentCount, historyCount, t]);
}

function EmptyFeed({ filter }: Readonly<{ filter: FeedFilter }>) {
	const t = useTranslations();
	let message = t('taskDetail.activity.EMPTY');
	if (filter === 'comments') {
		message = t('taskDrawer.NO_COMMENTS_MESSAGE');
	}
	if (filter === 'history') {
		message = t('pages.taskDetails.NO_ACTIVITY');
	}
	return (
		<p className="rounded-xl hairline-border border-dashed border-border px-4 py-5 text-center text-[13px] text-muted-foreground">
			{message}
		</p>
	);
}

interface TaskDetailActivityProps {
	task: TTask;
	/** The drawer pins its own composer at its foot. */
	showsComposer: boolean;
}

export function TaskDetailActivity({ task, showsComposer }: Readonly<TaskDetailActivityProps>) {
	const t = useTranslations();
	const { ref, hasComeNear } = useHasComeNear<HTMLDivElement>();
	const [filter, setFilter] = useState<FeedFilter>('all');
	const [showsAll, setShowsAll] = useState(false);
	const [replyingTo, setReplyingTo] = useState<string | null>(null);
	const commentedTask = useMemo(() => ({ id: task.id, title: task.title }), [task.id, task.title]);
	let loadedTask: typeof commentedTask | null = null;
	let loadedTaskId: string | null = null;
	if (hasComeNear) {
		loadedTask = commentedTask;
		loadedTaskId = task.id;
	}
	const discussion = useTaskComments(loadedTask);
	const history = useTaskActivityLog(loadedTaskId);
	const commentActions = useCommentActionsOf(discussion, loadedTaskId);
	const threads = useMemo(() => threadsOf(discussion.comments), [discussion.comments]);
	const filesByComment = useTaskCommentFiles(task.id);
	const canAttach = useCanAttachFiles({ entity: 'Task', entityId: task.id });
	const candidates = useMentionCandidates();
	const names = useMemo(() => candidates.map((candidate) => candidate.name), [candidates]);
	const filesOf = useCallback((commentId: string) => filesByComment.get(commentId) ?? NO_FILES, [filesByComment]);
	const tabs = useFeedTabs(discussion.comments.length, history.activities.length);
	const items = useMemo(
		() => feedItemsOf(threads, history.activities, filter),
		[filter, history.activities, threads]
	);

	const hiddenCount = items.length - VISIBLE_ITEMS;
	const hasHidden = hiddenCount > 0 && !showsAll;
	let shownItems = items;
	if (hasHidden) {
		shownItems = items.slice(hiddenCount);
	}
	const days = feedDaysOf(shownItems);
	const isLoading = !hasComeNear || discussion.isLoading || history.isLoading;
	const hasItems = items.length > 0;
	const hasFailure = discussion.isError || history.isError;
	const isError = hasFailure && !hasItems;
	const hasPartialFailure = hasFailure && hasItems;
	const showsEmpty = !isLoading && !hasFailure && !hasItems;
	const showsFeed = !isLoading && hasItems;
	const showsEarlierButton = hasHidden && showsFeed;
	const showsInlineComposer = showsComposer && filter !== 'history';

	const retry = () => {
		discussion.refetch();
		history.refetch();
	};

	return (
		<div ref={ref}>
			<CommentActionsProvider value={commentActions}>
			<TaskDetailSection
				title={t('common.ACTIVITY')}
				actions={
					<SegmentedControl
						items={tabs}
						value={filter}
						onValueChange={setFilter}
						ariaLabel={t('taskDetail.activity.FILTER')}
					/>
				}
			>
				{isLoading && <FeedSkeleton filter={filter} />}
				{isError && (
					<AnimatedEmptyState
						title={t('taskDetail.activity.LOAD_FAILED')}
						message={null}
						actionLabel={t('pages.unauthorized.TRY_AGAIN')}
						onAction={retry}
						minHeight="140px"
						showBorder={false}
						noBg={true}
					/>
				)}
				{showsEmpty && <EmptyFeed filter={filter} />}
				{showsEarlierButton && (
					<button
						type="button"
						onClick={() => setShowsAll(true)}
						className={cn(DETAIL_GHOST_ACTION, '-ml-2 w-fit')}
					>
						<ChevronUp aria-hidden="true" />
						{t('taskDetail.activity.SHOW_EARLIER', { count: hiddenCount })}
					</button>
				)}
				{showsFeed &&
					days.map((day) => (
						<Fragment key={day.key}>
							<h3 className="pt-1 text-xs font-medium text-muted-foreground">
								{dayLabelOf(day.date, t)}
							</h3>
							<ul className="flex flex-col gap-3">
								{day.items.map((item, index) => (
									<FeedEntry
										key={`${item.kind}-${item.id}`}
										item={item}
										connectsToNext={isHistoryItem(day.items[index + 1])}
										names={names}
										filesOf={filesOf}
										canAttach={canAttach}
										replyingTo={replyingTo}
										onReply={setReplyingTo}
										onPostReply={(body, mentionEmployeeIds, files, parentId) =>
											discussion.postComment(body, { parentId, mentionEmployeeIds, files })
										}
										isPosting={discussion.isPosting}
									/>
								))}
							</ul>
						</Fragment>
					))}
				{hasPartialFailure && (
					<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
						<span>{t('taskDetail.activity.PARTLY_LOADED')}</span>
						<button type="button" onClick={retry} className={DETAIL_GHOST_ACTION}>
							{t('pages.unauthorized.TRY_AGAIN')}
						</button>
					</div>
				)}
				{showsInlineComposer && (
					<div className="pt-1">
						<TaskCommentComposer task={task} />
					</div>
				)}
			</TaskDetailSection>
			</CommentActionsProvider>
		</div>
	);
}

/**
 * What the reader may do with the comments besides replying (see {@link CommentActions}): edit, delete and resolve
 * their own, react to any when reactions are on. One comment is edited at a time.
 */
function useCommentActionsOf(discussion: ReturnType<typeof useTaskComments>, taskId: string | null): CommentActions {
	const user = useAtomValue(userState);
	const employeeId = user?.employee?.id ?? user?.employeeId ?? null;
	const userId = user?.id ?? null;
	const userName = user?.name ?? '';
	const userImageUrl = user?.imageUrl ?? null;
	const [editingId, setEditingId] = useState<string | null>(null);
	const me = useMemo(
		() => (employeeId ? { employeeId, name: userName, imageUrl: userImageUrl } : null),
		[employeeId, userImageUrl, userName]
	);
	const reactions = useCommentReactions(taskId, me);
	const { editComment, deleteComment, setThreadResolved } = discussion;
	return useMemo<CommentActions>(
		() => ({
			reader: { employeeId, userId },
			editingId,
			setEditingId,
			editComment,
			deleteComment,
			setThreadResolved: (commentId, resolved) => setThreadResolved(commentId, resolved, employeeId),
			reactions: { ...reactions, canReact: me !== null }
		}),
		[deleteComment, editComment, editingId, employeeId, me, reactions, setThreadResolved, userId]
	);
}

function isHistoryItem(item: FeedItem | undefined) {
	return item?.kind === 'history';
}

function FeedSkeleton({ filter }: Readonly<{ filter: FeedFilter }>) {
	if (filter === 'history') {
		return <ActivitySkeleton />;
	}
	return <CommentsSkeleton />;
}

interface FeedEntryProps {
	item: FeedItem;
	connectsToNext: boolean;
	names: string[];
	filesOf: (commentId: string) => TEntityFileLink[];
	canAttach: boolean;
	replyingTo: string | null;
	onReply: (commentId: string | null) => void;
	onPostReply: (body: string, mentionEmployeeIds: string[], files: File[], parentId: string) => Promise<boolean>;
	isPosting: boolean;
}

function FeedEntry({
	item,
	connectsToNext,
	names,
	filesOf,
	canAttach,
	replyingTo,
	onReply,
	onPostReply,
	isPosting
}: Readonly<FeedEntryProps>) {
	if (item.kind === 'history') {
		return <HistoryEntry activity={item.activity} connectsToNext={connectsToNext} />;
	}
	const commentId = item.thread.comment.id;
	return (
		<CommentThreadView
			thread={item.thread}
			names={names}
			filesOf={filesOf}
			canAttach={canAttach}
			isReplying={replyingTo === commentId}
			onReply={() => onReply(commentId)}
			onCancelReply={() => onReply(null)}
			onPostReply={(body, mentionEmployeeIds, files) => onPostReply(body, mentionEmployeeIds, files, commentId)}
			isPosting={isPosting}
		/>
	);
}
