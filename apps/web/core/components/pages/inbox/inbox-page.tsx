'use client';

import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Archive, AtSign, Check, CheckDouble, Clock, Filter, HelpCircle, InboxCheck, Mail, MailOpen, MoreHorizontal, Settings, UserAdd } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { NotificationEmptyState, NotificationErrorState, NotificationRowsSkeleton } from '@/core/components/notifications/inbox/notification-states';
import { personFromTeamMember, type Person } from '@/core/components/teams/people-avatars';
import { useInboxActions } from '@/core/hooks/inbox/use-inbox-actions';
import { useInboxAvailability } from '@/core/hooks/inbox/use-inbox-availability';
import { useInboxCounts, useInboxItems } from '@/core/hooks/inbox/use-inbox-items';
import { useInboxKeyboard } from '@/core/hooks/inbox/use-inbox-keyboard';
import { useNotificationActions, useNotificationInbox, useUnreadNotificationCount } from '@/core/hooks/notifications/use-notification-inbox';
import { useTaskDrawer } from '@/core/hooks/tasks/use-task-drawer';
import { isInboxEnabled } from '@/core/lib/utils/inbox-enabled';
import {
	INBOX_PRIMARY_FILTERS,
	INBOX_SECONDARY_FILTERS,
	INBOX_SOURCE_GROUPS,
	InboxDayGroup,
	InboxEntry,
	InboxFilter,
	InboxSourceGroup,
	filterInboxEntries,
	fromNotificationEntry,
	groupInboxEntriesByDay,
	snoozeUntil
} from '@/core/lib/utils/inbox-entry';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';
import { cn } from '@/core/lib/helpers';
import { InboxDetail } from './inbox-detail';
import { InboxRow } from './inbox-row';
import { InboxPageSkeleton } from './inbox-page-skeleton';

const NOTIFICATION_SETTINGS_HREF = '/settings/personal/notifications';

const FILTER_KEYS: Record<InboxFilter, DottedLanguageObjectStringPaths> = {
	all: 'inbox.FILTERS.ALL',
	unread: 'inbox.FILTERS.UNREAD',
	mentions: 'inbox.FILTERS.MENTIONS',
	assigned: 'inbox.FILTERS.ASSIGNED',
	snoozed: 'inbox.FILTERS.SNOOZED',
	done: 'inbox.FILTERS.DONE',
	archived: 'inbox.FILTERS.ARCHIVED'
};

const SOURCE_KEYS: Record<InboxSourceGroup, DottedLanguageObjectStringPaths> = {
	tasks: 'inbox.SOURCES.TASKS',
	chat: 'inbox.SOURCES.CHAT',
	docs: 'inbox.SOURCES.DOCS',
	email: 'inbox.SOURCES.EMAIL',
	integrations: 'inbox.SOURCES.INTEGRATIONS',
	people: 'inbox.SOURCES.PEOPLE',
	other: 'inbox.SOURCES.OTHER'
};

const GROUP_KEYS: Record<InboxDayGroup, DottedLanguageObjectStringPaths> = {
	today: 'notifications.GROUPS.TODAY',
	yesterday: 'notifications.GROUPS.YESTERDAY',
	earlier: 'notifications.GROUPS.EARLIER'
};

const EMPTY_KEYS: Record<InboxFilter, { icon: ReactNode; title: DottedLanguageObjectStringPaths; text: DottedLanguageObjectStringPaths }> = {
	all: { icon: <InboxCheck />, title: 'inbox.EMPTY.ALL_TITLE', text: 'inbox.EMPTY.ALL_TEXT' },
	unread: { icon: <InboxCheck />, title: 'inbox.EMPTY.UNREAD_TITLE', text: 'inbox.EMPTY.UNREAD_TEXT' },
	mentions: { icon: <AtSign />, title: 'inbox.EMPTY.MENTIONS_TITLE', text: 'inbox.EMPTY.MENTIONS_TEXT' },
	assigned: { icon: <UserAdd />, title: 'inbox.EMPTY.ASSIGNED_TITLE', text: 'inbox.EMPTY.ASSIGNED_TEXT' },
	snoozed: { icon: <Clock />, title: 'inbox.EMPTY.SNOOZED_TITLE', text: 'inbox.EMPTY.SNOOZED_TEXT' },
	done: { icon: <Check />, title: 'inbox.EMPTY.DONE_TITLE', text: 'inbox.EMPTY.DONE_TEXT' },
	archived: { icon: <Archive />, title: 'inbox.EMPTY.ARCHIVED_TITLE', text: 'inbox.EMPTY.ARCHIVED_TEXT' }
};

const ALL_FILTERS: readonly InboxFilter[] = [...INBOX_PRIMARY_FILTERS, ...INBOX_SECONDARY_FILTERS];

function filterOf(value: string | null): InboxFilter {
	return (ALL_FILTERS as readonly string[]).includes(value ?? '') ? (value as InboxFilter) : 'all';
}

function sourceOf(value: string | null): InboxSourceGroup | null {
	return (INBOX_SOURCE_GROUPS as readonly string[]).includes(value ?? '') ? (value as InboxSourceGroup) : null;
}

/** The people of the active team by employee id, for the rows' avatars. */
function usePeople(): Map<string, Person> {
	const team = useAtomValue(activeTeamState);
	return useMemo(() => {
		const people = new Map<string, Person>();
		for (const member of team?.members ?? []) {
			const employeeId = String(member.employeeId ?? member.employee?.id ?? '');
			if (employeeId) people.set(employeeId, personFromTeamMember(member));
		}
		return people;
	}, [team?.members]);
}

/** The titles of the loaded team tasks by id, so a task entry leads with the task as it is now. */
function useTaskTitles(): Map<string, string> {
	const tasks = useAtomValue(tasksByTeamState);
	return useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
}

/**
 * The Inbox page (`/inbox`): the signed-in person's notifications and items, newest first, grouped by day, with
 * tabs, a source filter, triage actions (read, archive, snooze, done, mark all read with undo), keyboard navigation
 * and a detail pane. Behind `NEXT_PUBLIC_INBOX_ENABLED`; on a platform without the inbox extension it works
 * with the bell's data (read, unread and archive only).
 */
export function InboxPage() {
	return (
		<Suspense fallback={<InboxPageSkeleton />}>
			<InboxPageContent />
		</Suspense>
	);
}

/** The page itself; apart so the search-params reader sits under a Suspense boundary. */
function InboxPageContent() {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const enabled = isInboxEnabled();

	useEffect(() => {
		if (!enabled) router.replace('/');
	}, [enabled, router]);

	const availability = useInboxAvailability(enabled);
	const usesExtension = availability === 'available';
	const isLegacy = availability === 'unavailable';

	const filter = filterOf(searchParams.get('tab'));
	const sourceGroup = sourceOf(searchParams.get('source'));
	const [q, setQ] = useState('');
	const setParams = useCallback(
		(next: { tab?: InboxFilter; source?: InboxSourceGroup | null }) => {
			const params = new URLSearchParams(searchParams.toString());
			if (next.tab !== undefined) {
				if (next.tab === 'all') params.delete('tab');
				else params.set('tab', next.tab);
			}
			if (next.source !== undefined) {
				if (next.source) params.set('source', next.source);
				else params.delete('source');
			}
			const search = params.toString();
			router.replace(search ? `${pathname}?${search}` : pathname);
		},
		[pathname, router, searchParams]
	);

	const selection = useMemo(() => ({ filter, sourceGroup, q }), [filter, sourceGroup, q]);
	const items = useInboxItems(selection, enabled && usesExtension);
	const counts = useInboxCounts(enabled && usesExtension);
	const legacy = useNotificationInbox(enabled && isLegacy);
	const legacyUnread = useUnreadNotificationCount();
	const legacyActions = useNotificationActions();
	const actions = useInboxActions();
	const { openTaskDrawer } = useTaskDrawer();
	const people = usePeople();
	const taskTitles = useTaskTitles();

	const entries = useMemo(
		() => (usesExtension ? items.entries : filterInboxEntries(legacy.entries.map(fromNotificationEntry), filter, sourceGroup)),
		[filter, items.entries, legacy.entries, sourceGroup, usesExtension]
	);
	const unreadCount = usesExtension ? counts.unread : legacyUnread;
	const isLoading = availability === 'unknown' || (usesExtension ? items.isLoading : legacy.isLoading);
	const isError = usesExtension ? items.isError : legacy.isError;
	const retry = usesExtension ? items.retry : legacy.retry;

	const [now] = useState(() => new Date());
	const groups = useMemo(() => groupInboxEntriesByDay(entries, now), [entries, now]);
	const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
	const [currentId, setCurrentId] = useState<string | null>(null);
	const current = useMemo(() => entries.find((entry) => entry.id === currentId) ?? null, [currentId, entries]);
	const byId = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

	// Leaving the list of a filter drops a selection that no longer shows.
	useEffect(() => {
		setSelected(new Set());
	}, [filter, sourceGroup]);

	const reportFailure = useCallback(() => toast.error(t('inbox.TOASTS.UPDATE_FAILED')), [t]);

	/** The entries an action applies to: the selection when the entry is part of it, else the entry alone. */
	const targetsOf = useCallback(
		(entry: InboxEntry): InboxEntry[] => {
			if (!selected.has(entry.id)) return [entry];
			return [...selected].map((id) => byId.get(id)).filter((candidate): candidate is InboxEntry => !!candidate);
		},
		[byId, selected]
	);

	const setRead = useCallback(
		async (targets: InboxEntry[], isRead: boolean) => {
			if (usesExtension) return actions.setState(targets.map((entry) => entry.id), { isRead });
			await Promise.all(targets.map((entry) => legacyActions.setRead(entry.id, isRead)));
		},
		[actions, legacyActions, usesExtension]
	);

	const setArchived = useCallback(
		async (targets: InboxEntry[], isArchived: boolean) => {
			if (usesExtension) return actions.setState(targets.map((entry) => entry.id), { isArchived });
			await Promise.all(targets.map((entry) => (isArchived ? legacyActions.archive(entry.id) : legacyActions.unarchive(entry.id))));
		},
		[actions, legacyActions, usesExtension]
	);

	const handleOpen = useCallback(
		(entry: InboxEntry) => {
			setCurrentId(entry.id);
			if (entry.isUnread) setRead([entry], true).catch(reportFailure);
			if (entry.taskId) {
				openTaskDrawer(entry.taskId);
				return;
			}
			if (entry.href) router.push(entry.href);
		},
		[openTaskDrawer, reportFailure, router, setRead]
	);

	const handleToggleSelect = useCallback((entry: InboxEntry) => {
		setSelected((previous) => {
			const next = new Set(previous);
			if (next.has(entry.id)) next.delete(entry.id);
			else next.add(entry.id);
			return next;
		});
	}, []);

	const handleToggleRead = useCallback(
		(entry: InboxEntry) => {
			const targets = targetsOf(entry);
			setRead(targets, entry.isUnread).catch(reportFailure);
		},
		[reportFailure, setRead, targetsOf]
	);

	const handleArchive = useCallback(
		(entry: InboxEntry) => {
			const targets = targetsOf(entry);
			const archiving = !entry.isArchived;
			setArchived(targets, archiving)
				.then(() => {
					if (!archiving) return;
					toast(t('inbox.TOASTS.ARCHIVED', { count: targets.length }), {
						action: { label: t('inbox.TOASTS.UNDO'), onClick: () => setArchived(targets, false).catch(reportFailure) }
					});
				})
				.catch(reportFailure);
			setSelected(new Set());
		},
		[reportFailure, setArchived, t, targetsOf]
	);

	const handleSnooze = useCallback(
		(entry: InboxEntry, until: Date | null) => {
			const targets = targetsOf(entry);
			const ids = targets.map((candidate) => candidate.id);
			actions
				.setState(ids, { snoozedUntil: until ? until.toISOString() : null })
				.then(() => {
					if (!until) return;
					toast(t('inbox.TOASTS.SNOOZED', { count: targets.length }), {
						action: { label: t('inbox.TOASTS.UNDO'), onClick: () => actions.setState(ids, { snoozedUntil: null }).catch(reportFailure) }
					});
				})
				.catch(reportFailure);
			setSelected(new Set());
		},
		[actions, reportFailure, t, targetsOf]
	);

	const handleDone = useCallback(
		(entry: InboxEntry) => {
			const targets = targetsOf(entry);
			const ids = targets.map((candidate) => candidate.id);
			const done = !entry.isDone;
			actions
				.setState(ids, { isDone: done })
				.then(() => {
					if (!done) return;
					toast(t('inbox.TOASTS.DONE', { count: targets.length }), {
						action: { label: t('inbox.TOASTS.UNDO'), onClick: () => actions.setState(ids, { isDone: false }).catch(reportFailure) }
					});
				})
				.catch(reportFailure);
			setSelected(new Set());
		},
		[actions, reportFailure, t, targetsOf]
	);

	const handleMarkAll = useCallback(() => {
		const failed = () => toast.error(t('inbox.TOASTS.MARK_ALL_FAILED'));
		if (!usesExtension) {
			legacyActions.markAllAsRead().catch(failed);
			return;
		}
		actions
			.markAllRead(filter)
			.then(({ undo }) => {
				toast(t('inbox.TOASTS.ALL_READ'), { action: { label: t('inbox.TOASTS.UNDO'), onClick: () => undo().catch(reportFailure) } });
			})
			.catch(failed);
	}, [actions, filter, legacyActions, reportFailure, t, usesExtension]);

	const byIdAction = useCallback(
		(handler: (entry: InboxEntry) => void) => (id: string) => {
			const entry = byId.get(id);
			if (entry) handler(entry);
		},
		[byId]
	);
	const onKeyDown = useInboxKeyboard({
		onOpen: byIdAction(handleOpen),
		onToggleSelect: byIdAction(handleToggleSelect),
		onArchive: byIdAction(handleArchive),
		// `H` snoozes until tomorrow morning; the row's menu offers the other presets.
		onSnooze: byIdAction((entry) => (usesExtension ? handleSnooze(entry, snoozeUntil('tomorrow')) : undefined)),
		onToggleRead: byIdAction(handleToggleRead),
		onDone: byIdAction((entry) => (usesExtension ? handleDone(entry) : undefined)),
		onMarkAllRead: handleMarkAll
	});

	// Infinite scroll: the sentinel at the end of the list asks for the next page.
	const sentinel = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const element = sentinel.current;
		if (!element || !usesExtension || !items.hasNextPage) return;
		const observer = new IntersectionObserver((observed) => {
			if (observed.some((entry) => entry.isIntersecting) && !items.isFetchingNextPage) void items.fetchNextPage();
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, [items, usesExtension]);

	const filterItems = useMemo<SegmentedControlItem<InboxFilter>[]>(
		() =>
			INBOX_PRIMARY_FILTERS.map((value) => ({
				value,
				label: t(FILTER_KEYS[value]),
				...(value === 'unread' && unreadCount > 0 ? { count: unreadCount } : {})
			})),
		[t, unreadCount]
	);
	const isSecondary = (INBOX_SECONDARY_FILTERS as readonly string[]).includes(filter);
	const emptyCopy = EMPTY_KEYS[filter];
	const showsList = !isLoading && !isError;
	const selectedCount = selected.size;
	const anySelected = selectedCount > 0;
	const firstSelected = anySelected ? byId.get([...selected][0]) ?? null : null;

	if (!enabled) return <InboxPageSkeleton />;

	return (
		<PageLayout title={t('inbox.TITLE')} className="min-h-0 flex-1 p-0">
			<div className="flex h-full min-h-0 flex-col">
				<div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-3 pb-2">
					<h1 className="text-base font-semibold text-foreground">{t('inbox.TITLE')}</h1>
					<span className="text-xs tabular-nums text-muted-foreground">{t('inbox.UNREAD_COUNT', { count: unreadCount })}</span>
					<span className="ml-auto flex items-center gap-1">
						<span className="hidden text-xs text-muted-foreground lg:inline-flex" title={t('inbox.KEYBOARD.HINT')}>
							<HelpCircle className="size-4" aria-label={t('inbox.KEYBOARD.HINT')} />
						</span>
						<Button variant="ghost" size="sm" onClick={handleMarkAll} disabled={unreadCount === 0 && !entries.some((entry) => entry.isUnread)}>
							<CheckDouble className="size-4" />
							{t('inbox.ACTIONS.MARK_ALL_READ')}
						</Button>
						<Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('notifications.SETTINGS')} title={t('notifications.SETTINGS')}>
							<Link href={NOTIFICATION_SETTINGS_HREF}>
								<Settings className="size-4" />
							</Link>
						</Button>
					</span>
				</div>

				<div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-2">
					<SegmentedControl
						items={filterItems}
						value={isSecondary ? ('' as InboxFilter) : filter}
						onValueChange={(value) => setParams({ tab: value })}
						ariaLabel={t('inbox.FILTER_LABEL')}
					/>
					{usesExtension && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant={isSecondary ? 'secondary' : 'ghost'} size="sm">
									<MoreHorizontal className="size-4" />
									{isSecondary ? t(FILTER_KEYS[filter]) : t('inbox.FILTERS.MORE')}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{INBOX_SECONDARY_FILTERS.map((value) => (
									<DropdownMenuItem key={value} onClick={() => setParams({ tab: value })}>
										{t(FILTER_KEYS[value])}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant={sourceGroup ? 'secondary' : 'ghost'} size="sm" aria-label={t('inbox.SOURCES.LABEL')}>
								<Filter className="size-4" />
								{sourceGroup ? t(SOURCE_KEYS[sourceGroup]) : t('inbox.SOURCES.ANY')}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuRadioGroup value={sourceGroup ?? ''} onValueChange={(value) => setParams({ source: sourceOf(value) })}>
								<DropdownMenuRadioItem value="">{t('inbox.SOURCES.ANY')}</DropdownMenuRadioItem>
								{INBOX_SOURCE_GROUPS.map((value) => (
									<DropdownMenuRadioItem key={value} value={value}>
										{t(SOURCE_KEYS[value])}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					{usesExtension && (
						<input
							type="search"
							value={q}
							onChange={(event) => setQ(event.target.value)}
							placeholder={t('inbox.SEARCH')}
							aria-label={t('inbox.SEARCH')}
							className="h-8 w-48 rounded-md border border-border bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
						/>
					)}
				</div>

				{isLegacy && <p className="mx-4 mb-2 rounded-md bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground">{t('inbox.LEGACY_NOTICE')}</p>}

				{anySelected && firstSelected && (
					<div className="mx-4 mb-2 flex flex-wrap items-center gap-1 rounded-md bg-primary/[0.06] px-3 py-1.5 text-sm">
						<span className="mr-2 tabular-nums">{t('inbox.SELECTED', { count: selectedCount })}</span>
						<Button variant="ghost" size="sm" onClick={() => handleToggleRead(firstSelected)}>
							{firstSelected.isUnread ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
							{firstSelected.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')}
						</Button>
						<Button variant="ghost" size="sm" onClick={() => handleArchive(firstSelected)}>
							<Archive className="size-4" />
							{firstSelected.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')}
						</Button>
						{usesExtension && (
							<Button variant="ghost" size="sm" onClick={() => handleDone(firstSelected)}>
								<Check className="size-4" />
								{firstSelected.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')}
							</Button>
						)}
						<Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}>
							{t('inbox.ACTIONS.CLEAR_SELECTION')}
						</Button>
					</div>
				)}

				<div className="flex min-h-0 flex-1">
					<div
						className="min-h-0 flex-1 overflow-y-auto overscroll-contain hairline-t border-border"
						onKeyDown={onKeyDown}
						aria-live="polite"
						aria-busy={isLoading}
					>
						{isLoading && <NotificationRowsSkeleton rows={8} />}
						{isError && <NotificationErrorState message={t('inbox.LOAD_ERROR')} retryLabel={t('inbox.RETRY')} onRetry={() => retry()} />}
						{showsList && entries.length === 0 && (
							<NotificationEmptyState icon={emptyCopy.icon} title={t(emptyCopy.title)} message={t(emptyCopy.text)} />
						)}
						{showsList &&
							groups.map((group) => (
								<section key={group.day} className="px-2 pb-2" aria-label={t(GROUP_KEYS[group.day])}>
									<h2 className="px-3 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t(GROUP_KEYS[group.day])}</h2>
									{group.entries.map((entry) => (
										<InboxRow
											key={entry.id}
											entry={entry}
											person={entry.sentByEmployeeId ? (people.get(entry.sentByEmployeeId) ?? null) : null}
											taskTitle={entry.taskId ? (taskTitles.get(entry.taskId) ?? null) : null}
											locale={locale}
											now={now}
											isSelected={selected.has(entry.id)}
											isCurrent={entry.id === currentId}
											canTriage={usesExtension}
											onOpen={handleOpen}
											onToggleSelect={handleToggleSelect}
											onToggleRead={handleToggleRead}
											onArchive={handleArchive}
											onSnooze={handleSnooze}
											onDone={handleDone}
										/>
									))}
								</section>
							))}
						{showsList && usesExtension && items.hasNextPage && (
							<div ref={sentinel} className="flex justify-center py-3">
								<Button variant="ghost" size="sm" onClick={() => void items.fetchNextPage()} disabled={items.isFetchingNextPage}>
									{t('inbox.LOAD_MORE')}
								</Button>
							</div>
						)}
						{showsList && isLegacy && legacy.hasMoreThanLoaded && (
							<p className="px-5 py-3 text-xs text-muted-foreground">{t('notifications.LATEST_SHOWN', { count: entries.length })}</p>
						)}
					</div>
					<aside className={cn('hidden w-[22rem] shrink-0 overflow-y-auto hairline-l border-border lg:block')}>
						<InboxDetail entry={current} taskTitle={current?.taskId ? (taskTitles.get(current.taskId) ?? null) : null} onOpenTarget={handleOpen} onArchive={handleArchive} />
					</aside>
				</div>
			</div>
		</PageLayout>
	);
}
