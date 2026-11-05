'use client';

import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AtSign, CheckDouble, InboxCheck, Settings, UserAdd } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { useNotificationActions, useNotificationInbox } from '@/core/hooks/notifications/use-notification-inbox';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import {
	countUnreadEntries,
	filterNotificationEntries,
	groupNotificationEntriesByDay,
	NotificationDayGroup,
	NotificationEntry,
	NotificationFilter
} from '@/core/lib/utils/notification-inbox';
import { NOTIFICATION_INBOX_PAGE_SIZE } from '@/core/services/client/api/notifications';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { NotificationRow, NotificationTaskContext } from './notification-row';
import { NotificationEmptyState, NotificationErrorState, NotificationRowsSkeleton } from './notification-states';

export const NOTIFICATION_SETTINGS_HREF = '/settings/personal/notifications';

const GROUP_KEYS: Record<NotificationDayGroup, DottedLanguageObjectStringPaths> = {
	today: 'notifications.GROUPS.TODAY',
	yesterday: 'notifications.GROUPS.YESTERDAY',
	earlier: 'notifications.GROUPS.EARLIER'
};

interface EmptyCopy {
	icon: ReactNode;
	titleKey: DottedLanguageObjectStringPaths;
	messageKey: DottedLanguageObjectStringPaths;
}

const EMPTY_COPY: Record<NotificationFilter, EmptyCopy> = {
	all: {
		icon: <InboxCheck />,
		titleKey: 'notifications.EMPTY.ALL_TITLE',
		messageKey: 'notifications.EMPTY.ALL_TEXT'
	},
	unread: {
		icon: <InboxCheck />,
		titleKey: 'notifications.EMPTY.UNREAD_TITLE',
		messageKey: 'notifications.EMPTY.UNREAD_TEXT'
	},
	mentions: {
		icon: <AtSign />,
		titleKey: 'notifications.EMPTY.MENTIONS_TITLE',
		messageKey: 'notifications.EMPTY.MENTIONS_TEXT'
	},
	assigned: {
		icon: <UserAdd />,
		titleKey: 'notifications.EMPTY.ASSIGNED_TITLE',
		messageKey: 'notifications.EMPTY.ASSIGNED_TEXT'
	}
};

function taskContextOf(task: TTask): NotificationTaskContext {
	return {
		number: task.taskNumber ?? task.number ?? null,
		issueType: task.issueType ?? null,
		title: task.title
	};
}

function useTaskContexts(): Map<string, NotificationTaskContext> {
	const tasks = useAtomValue(tasksByTeamState);

	return useMemo(() => {
		const contexts = new Map<string, NotificationTaskContext>();
		for (const task of tasks) {
			contexts.set(task.id, taskContextOf(task));
		}

		return contexts;
	}, [tasks]);
}

function taskContextFor(
	entry: NotificationEntry,
	contexts: Map<string, NotificationTaskContext>
): NotificationTaskContext | null {
	if (!entry.taskId) {
		return null;
	}

	return contexts.get(entry.taskId) ?? null;
}

const ROW_SELECTOR = '[data-notification-row]';

/** Up and down move between rows, like a list in Linear; Tab still walks every control. */
function moveRowFocus(event: KeyboardEvent<HTMLDivElement>) {
	const isDown = event.key === 'ArrowDown';
	const isUp = event.key === 'ArrowUp';
	if (!isDown && !isUp) {
		return;
	}
	const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(ROW_SELECTOR));
	if (rows.length === 0) {
		return;
	}
	event.preventDefault();
	const current = rows.indexOf(document.activeElement as HTMLButtonElement);
	const target = current + stepOf(isDown);
	const lastIndex = rows.length - 1;
	const next = Math.min(lastIndex, Math.max(0, target));
	rows[next]?.focus();
}

function stepOf(isDown: boolean): number {
	if (isDown) {
		return 1;
	}

	return -1;
}

/** A zero stays silent: the Unread option shows a count only when something is unread. */
function unreadChipOf(unreadCount: number): number | undefined {
	if (unreadCount === 0) {
		return undefined;
	}

	return unreadCount;
}

function useFilterItems(unreadCount: number): SegmentedControlItem<NotificationFilter>[] {
	const t = useTranslations();

	return useMemo(
		() => [
			{ value: 'all', label: t('notifications.FILTERS.ALL') },
			{ value: 'unread', label: t('notifications.FILTERS.UNREAD'), count: unreadChipOf(unreadCount) },
			{ value: 'mentions', label: t('notifications.FILTERS.MENTIONS') },
			{ value: 'assigned', label: t('notifications.FILTERS.ASSIGNED') }
		],
		[t, unreadCount]
	);
}

/** The inbox of the bell: header, filters, the rows grouped by day, and Mark all as read. */
export function NotificationPanel({ onClose, unreadCount }: Readonly<{ onClose: () => void; unreadCount: number }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [filter, setFilter] = useState<NotificationFilter>('all');
	const { entries, hasMoreThanLoaded, isLoading, isError, retry } = useNotificationInbox(true);
	const { setRead, archive, unarchive, markAllAsRead, isMarkingAll } = useNotificationActions();
	const { openTaskDrawer } = useTaskDrawer();
	const router = useRouter();
	const taskContexts = useTaskContexts();
	const filterItems = useFilterItems(unreadCount);

	// Ages are read once per opening of the panel, which mounts with it.
	const [now] = useState(() => new Date());
	const visibleEntries = useMemo(() => filterNotificationEntries(entries, filter), [entries, filter]);
	const groups = useMemo(() => groupNotificationEntriesByDay(visibleEntries, now), [visibleEntries, now]);
	const loadedUnreadCount = countUnreadEntries(entries);
	const hasNothingToMark = unreadCount === 0 && loadedUnreadCount === 0;

	const reportFailure = useCallback(() => {
		toast.error(t('notifications.UPDATE_FAILED'));
	}, [t]);

	const handleOpen = useCallback(
		(entry: NotificationEntry) => {
			if (entry.isUnread) {
				setRead(entry.id, true).catch(reportFailure);
			}
			if (entry.href) {
				onClose();
				router.push(entry.href);
				return;
			}
			if (!entry.taskId) {
				return;
			}
			onClose();
			openTaskDrawer(entry.taskId);
		},
		[onClose, openTaskDrawer, reportFailure, router, setRead]
	);

	const handleToggleRead = useCallback(
		(entry: NotificationEntry) => {
			setRead(entry.id, entry.isUnread).catch(reportFailure);
		},
		[reportFailure, setRead]
	);

	const handleArchive = useCallback(
		(entry: NotificationEntry) => {
			archive(entry.id)
				.then(() => {
					toast(t('notifications.ARCHIVED'), {
						action: {
							label: t('notifications.UNDO'),
							onClick: () => unarchive(entry.id).catch(reportFailure)
						}
					});
				})
				.catch(reportFailure);
		},
		[archive, reportFailure, t, unarchive]
	);

	const handleMarkAll = useCallback(() => {
		markAllAsRead().catch(() => toast.error(t('notifications.MARK_ALL_FAILED')));
	}, [markAllAsRead, t]);

	const emptyCopy = EMPTY_COPY[filter];
	const showsList = !isLoading && !isError;
	const isEmpty = showsList && visibleEntries.length === 0;
	const hasRows = showsList && visibleEntries.length > 0;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex h-11 shrink-0 items-center gap-2 pl-4 pr-2">
				<h2 className="text-[13px] font-semibold text-foreground">{t('notifications.TITLE')}</h2>
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('notifications.UNREAD_COUNT', { count: unreadCount })}
				</span>
				<Button
					asChild
					variant="ghost"
					size="icon-sm"
					className="ml-auto text-muted-foreground"
					aria-label={t('notifications.SETTINGS')}
					title={t('notifications.SETTINGS')}
				>
					<Link href={NOTIFICATION_SETTINGS_HREF} onClick={onClose}>
						<Settings className="size-4" />
					</Link>
				</Button>
			</div>

			<div className="shrink-0 px-3 pb-2">
				<SegmentedControl
					items={filterItems}
					value={filter}
					onValueChange={setFilter}
					ariaLabel={t('notifications.FILTER_LABEL')}
					className="flex w-full [&>[data-segment]]:flex-1"
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain hairline-t border-border">
				{isLoading && <NotificationRowsSkeleton />}
				{isError && (
					<NotificationErrorState
						message={t('notifications.LOAD_ERROR')}
						retryLabel={t('notifications.RETRY')}
						onRetry={() => retry()}
					/>
				)}
				{isEmpty && (
					<NotificationEmptyState
						icon={emptyCopy.icon}
						title={t(emptyCopy.titleKey)}
						message={t(emptyCopy.messageKey)}
					/>
				)}
				{hasRows && (
					<div onKeyDown={moveRowFocus} className="flex flex-col gap-1 p-1.5">
						{groups.map((group) => (
							<section key={group.group} aria-label={t(GROUP_KEYS[group.group])}>
								<div className="flex items-center gap-2 px-3 pb-1 pt-2">
									<span className="text-xs font-medium text-muted-foreground">
										{t(GROUP_KEYS[group.group])}
									</span>
									<span className="text-xs tabular-nums text-muted-foreground/70">
										{group.entries.length}
									</span>
									<span aria-hidden="true" className="h-px flex-1 bg-border" />
								</div>
								<ul className="flex flex-col">
									{group.entries.map((entry) => (
										<NotificationRow
											key={entry.id}
											entry={entry}
											task={taskContextFor(entry, taskContexts)}
											locale={locale}
											now={now}
											onOpen={handleOpen}
											onToggleRead={handleToggleRead}
											onArchive={handleArchive}
										/>
									))}
								</ul>
							</section>
						))}
					</div>
				)}
			</div>

			<div className="flex h-10 shrink-0 items-center gap-2 hairline-t border-border pl-4 pr-1.5">
				{hasMoreThanLoaded && (
					<span className="text-xs text-muted-foreground">
						{t('notifications.LATEST_SHOWN', { count: NOTIFICATION_INBOX_PAGE_SIZE })}
					</span>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleMarkAll}
					disabled={hasNothingToMark || isMarkingAll}
					className="ml-auto text-muted-foreground"
				>
					<CheckDouble className="size-4" />
					{t('notifications.MARK_ALL_READ')}
				</Button>
			</div>
		</div>
	);
}
