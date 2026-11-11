'use client';

import { type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Archive, AtSign, Check, CheckDouble, Clock, Filter, InboxCheck, Mail, MailOpen, MoreHorizontal, Search, Settings, UserAdd, X } from '@/core/components/icons';
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
import { useChatPeople } from '@/core/hooks/chat/use-chat-scope';
import { useInboxActions } from '@/core/hooks/inbox/use-inbox-actions';
import { useInboxAvailability } from '@/core/hooks/inbox/use-inbox-availability';
import { useInboxCounts, useInboxItem, useInboxItems } from '@/core/hooks/inbox/use-inbox-items';
import { useInboxKeyboard } from '@/core/hooks/inbox/use-inbox-keyboard';
import { useInboxScope } from '@/core/hooks/inbox/use-inbox-scope';
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
	hasChatPages,
	snoozeUntil,
	toInboxEntry
} from '@/core/lib/utils/inbox-entry';
import { chatService } from '@/core/services/client/api/chat';
import { inboxService } from '@/core/services/client/api/inbox';
import type { IInboxItem } from '@/core/types/interfaces/common/inbox-item';
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

/** No selection (one instance, so an unchanged selection keeps its identity). */
const NO_SELECTION: ReadonlySet<string> = new Set();

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

/**
 * The people by employee id, for the rows' avatars: the members of the active team, and (where chat is on) everyone
 * else of the organization, so a message from a colleague of another team still shows who sent it.
 */
function usePeople(): Map<string, Person> {
	const team = useAtomValue(activeTeamState);
	const { byEmployee } = useChatPeople();
	return useMemo(() => {
		const people = new Map<string, Person>();
		for (const person of byEmployee.values()) {
			people.set(person.employeeId, { id: person.employeeId, name: person.name, imageUrl: person.imageUrl ?? null });
		}
		for (const member of team?.members ?? []) {
			const employeeId = String(member.employeeId ?? member.employee?.id ?? '');
			if (employeeId) people.set(employeeId, personFromTeamMember(member));
		}
		return people;
	}, [byEmployee, team?.members]);
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

	const { availability, probeFailed, retry: retryProbe } = useInboxAvailability(enabled);
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

	const listSelection = useMemo(() => ({ filter, sourceGroup, q }), [filter, sourceGroup, q]);
	const items = useInboxItems(listSelection, enabled && usesExtension);
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
	// A failed availability check (offline, a server error) is an error with a retry, not an endless skeleton.
	const isLoading = (availability === 'unknown' && !probeFailed) || (usesExtension ? items.isLoading : legacy.isLoading);
	const isError = (availability === 'unknown' && probeFailed) || (usesExtension ? items.isError : legacy.isError);
	const retry = availability === 'unknown' ? retryProbe : usesExtension ? items.retry : legacy.retry;

	const [now] = useState(() => new Date());
	const groups = useMemo(() => groupInboxEntriesByDay(entries, now), [entries, now]);
	// The workspace the inbox reads; a switch in another tab changes it while this page stays mounted.
	const scope = useInboxScope();
	const scopeKey = scope ? `${scope.tenantId}:${scope.organizationId}:${scope.userId}` : '';
	// The selection remembers the list it was made in: leaving the list of a filter, or the workspace, drops a selection
	// that no longer shows, without an effect that clears it after the fact.
	const listKey = `${scopeKey}|${filter}:${sourceGroup}`;
	const [selection, setSelection] = useState<{ list: string; ids: ReadonlySet<string> }>(() => ({ list: listKey, ids: NO_SELECTION }));
	const selected: ReadonlySet<string> = selection.list === listKey ? selection.ids : NO_SELECTION;
	const setSelected = useCallback(
		(next: ReadonlySet<string> | ((previous: ReadonlySet<string>) => ReadonlySet<string>)) =>
			setSelection((current) => ({ list: listKey, ids: typeof next === 'function' ? next(current.list === listKey ? current.ids : NO_SELECTION) : next })),
		[listKey]
	);
	const [currentId, setCurrentId] = useState<string | null>(null);
	// The entry as it was opened. Opening an unread entry marks it read, which drops it from the Unread list; the pane
	// keeps showing it until the user closes it or opens another one. While it is out of the list the pane shows it as
	// the platform holds it (`useInboxItem`, refetched with the inbox), and this copy only until that first answers. It
	// belongs to the workspace it was opened in: after a switch (another tab can make one) the pane lets it go.
	const [opened, setOpened] = useState<{ scopeKey: string; entry: InboxEntry } | null>(null);
	const openedEntry = opened && opened.scopeKey === scopeKey ? opened.entry : null;
	const byId = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
	const held = useInboxItem(usesExtension && openedEntry && !byId.has(openedEntry.id) ? openedEntry.id : null);
	const heldEntry = held.data ?? openedEntry;
	const current = useMemo(
		() =>
			entries.find((entry) => entry.id === currentId) ??
			(heldEntry && heldEntry.id === currentId ? heldEntry : null),
		[currentId, entries, heldEntry]
	);

	const reportFailure = useCallback(() => toast.error(t('inbox.TOASTS.UPDATE_FAILED')), [t]);

	/**
	 * The entries an action applies to: the selection when the entry is part of it, else the entry alone. An entry
	 * kept in the pane after it left the list (read in the Unread tab) is no longer in `byId`: it still counts.
	 */
	const targetsOf = useCallback(
		(entry: InboxEntry): InboxEntry[] => {
			if (!selected.has(entry.id)) return [entry];
			return [...selected]
				.map((id) => byId.get(id) ?? (id === entry.id ? entry : undefined))
				.filter((candidate): candidate is InboxEntry => !!candidate);
		},
		[byId, selected]
	);

	/** Keeps the entry held for the pane in step with what an action changes on it, since it may have left the list. */
	const { patch: patchHeld, refresh: refreshHeld } = held;
	const patchOpened = useCallback(
		(ids: string[], patch: Partial<InboxEntry>) => {
			setOpened((kept) => (kept && ids.includes(kept.entry.id) ? { ...kept, entry: { ...kept.entry, ...patch } } : kept));
			void patchHeld(ids, patch);
		},
		[patchHeld]
	);

	/**
	 * The platform's state update, mirrored on the entry held for the pane. Once the update settles, whatever its
	 * outcome, the held item is read again from scratch: when any item of the update failed the pane shows what the
	 * platform holds rather than a copy restored from before (which would undo a change of its own that succeeded, and
	 * whatever else changed on it meanwhile), and no read that started before the update can answer last.
	 */
	const setState = useCallback(
		(ids: string[], state: Parameters<typeof actions.setState>[1]) => {
			const patch: Partial<InboxEntry> = {};
			if (state.isRead !== undefined) patch.isUnread = !state.isRead;
			if (state.isArchived !== undefined) patch.isArchived = state.isArchived;
			if (state.isDone !== undefined) patch.isDone = state.isDone;
			if (state.snoozedUntil !== undefined) patch.snoozedUntil = state.snoozedUntil ? new Date(state.snoozedUntil) : null;
			patchOpened(ids, patch);
			return actions.setState(ids, state).finally(() => void refreshHeld());
		},
		[actions, patchOpened, refreshHeld]
	);

	const setRead = useCallback(
		async (targets: InboxEntry[], isRead: boolean) => {
			if (usesExtension) return setState(targets.map((entry) => entry.id), { isRead });
			patchOpened(
				targets.map((entry) => entry.id),
				{ isUnread: !isRead }
			);
			await Promise.all(targets.map((entry) => legacyActions.setRead(entry.id, isRead)));
		},
		[legacyActions, patchOpened, setState, usesExtension]
	);

	const setArchived = useCallback(
		async (targets: InboxEntry[], isArchived: boolean) => {
			if (usesExtension) return setState(targets.map((entry) => entry.id), { isArchived });
			patchOpened(
				targets.map((entry) => entry.id),
				{ isArchived }
			);
			await Promise.all(targets.map((entry) => (isArchived ? legacyActions.archive(entry.id) : legacyActions.unarchive(entry.id))));
		},
		[legacyActions, patchOpened, setState, usesExtension]
	);

	/** Goes to what the entry is about: the task drawer, the conversation at the message, or the entry's own link. */
	const handleOpenTarget = useCallback(
		(entry: InboxEntry) => {
			if (entry.taskId) {
				openTaskDrawer(entry.taskId);
				return;
			}
			if (entry.chatMessageId && hasChatPages()) {
				const messageId = entry.chatMessageId;
				// The item names the message, not its conversation: the message itself says where it is, and whether it is
				// a reply (which opens in its thread).
				chatService
					.thread(messageId, { limit: 1 })
					.then(({ root }) => {
						const conversation = encodeURIComponent(String(root.conversationId));
						const thread = root.threadRootId ? `thread=${encodeURIComponent(String(root.threadRootId))}&` : '';
						router.push(`/chat/${conversation}?${thread}m=${encodeURIComponent(messageId)}`);
					})
					.catch(() => toast.error(t('inbox.DETAIL.MESSAGE_GONE')));
				return;
			}
			if (entry.href) router.push(entry.href);
		},
		[openTaskDrawer, router, t]
	);

	/**
	 * A click on a row: the entry is read and shown in the pane. A task also opens in its drawer, over the inbox.
	 * Anything else waits for "Open" where the pane is on screen, so reading the inbox does not leave it; without the
	 * pane (a phone), the click goes straight to the target, unless the entry is a question to answer here.
	 */
	const handleOpen = useCallback(
		(entry: InboxEntry, options: { follow?: boolean } = {}) => {
			setCurrentId(entry.id);
			setOpened({ scopeKey, entry: entry.isUnread ? { ...entry, isUnread: false } : entry });
			if (entry.isUnread) setRead([entry], true).catch(reportFailure);
			const hasPane = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
			if (entry.taskId || options.follow || (!hasPane && !entry.decision)) handleOpenTarget(entry);
		},
		[handleOpenTarget, reportFailure, scopeKey, setRead]
	);

	const handleToggleSelect = useCallback(
		(entry: InboxEntry) => {
			setSelected((previous) => {
				const next = new Set(previous);
				if (next.has(entry.id)) next.delete(entry.id);
				else next.add(entry.id);
				return next;
			});
		},
		[setSelected]
	);

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
		[reportFailure, setArchived, setSelected, t, targetsOf]
	);

	// A question, an approval or an escalation answered in the detail pane: the lists and counts follow the answer.
	const queryClient = useQueryClient();
	const handleReply = useCallback(
		async (entry: InboxEntry, input: { optionId?: string; text?: string }): Promise<boolean> => {
			try {
				const answered = await inboxService.reply(entry.id, input);
				// The platform's answer goes into the cached pages at once: the pane shows it, the form is gone.
				queryClient.setQueriesData<{ pages: Array<{ items: IInboxItem[] }> }>({ queryKey: ['inbox', 'items'] }, (data) =>
					data
						? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.id === answered.id ? { ...item, ...answered } : item)) })) }
						: data
				);
				toast(t('inbox.DECISION.SENT'));
				return true;
			} catch (error) {
				const message = ApiErrorService.isApiError(error) && error.message ? error.message : t('inbox.DECISION.SEND_FAILED');
				toast.error(message);
				return false;
			} finally {
				void queryClient.invalidateQueries({ queryKey: ['inbox'] });
			}
		},
		[queryClient, t]
	);

	const handleSnooze = useCallback(
		(entry: InboxEntry, until: Date | null) => {
			const targets = targetsOf(entry);
			const ids = targets.map((candidate) => candidate.id);
			setState(ids, { snoozedUntil: until ? until.toISOString() : null })
				.then(() => {
					if (!until) return;
					toast(t('inbox.TOASTS.SNOOZED', { count: targets.length }), {
						action: { label: t('inbox.TOASTS.UNDO'), onClick: () => setState(ids, { snoozedUntil: null }).catch(reportFailure) }
					});
				})
				.catch(reportFailure);
			setSelected(new Set());
		},
		[reportFailure, setSelected, setState, t, targetsOf]
	);

	const handleDone = useCallback(
		(entry: InboxEntry) => {
			const targets = targetsOf(entry);
			const ids = targets.map((candidate) => candidate.id);
			const done = !entry.isDone;
			setState(ids, { isDone: done })
				.then(() => {
					if (!done) return;
					toast(t('inbox.TOASTS.DONE', { count: targets.length }), {
						action: { label: t('inbox.TOASTS.UNDO'), onClick: () => setState(ids, { isDone: false }).catch(reportFailure) }
					});
				})
				.catch(reportFailure);
			setSelected(new Set());
		},
		[reportFailure, setSelected, setState, t, targetsOf]
	);

	const handleMarkAll = useCallback(() => {
		const failed = () => toast.error(t('inbox.TOASTS.MARK_ALL_FAILED'));
		if (!usesExtension) {
			legacyActions.markAllAsRead().catch(failed);
			return;
		}
		actions
			.markAllRead(listSelection)
			.then(({ count, scoped, undo }) => {
				// A filtered list says how many it marked: "all" would claim the hidden ones too.
				const message = scoped ? t('inbox.TOASTS.MARKED_READ', { count }) : t('inbox.TOASTS.ALL_READ');
				toast(message, undo ? { action: { label: t('inbox.TOASTS.UNDO'), onClick: () => undo().catch(reportFailure) } } : undefined);
			})
			.catch(failed);
	}, [actions, legacyActions, listSelection, reportFailure, t, usesExtension]);

	// `?item=` (a clicked browser notification): the entry opens once it is in the list.
	const linkedItemId = searchParams.get('item');
	const openedLinkRef = useRef<string | null>(null);
	useEffect(() => {
		if (!linkedItemId || openedLinkRef.current === linkedItemId || isLoading) return;
		const entry = byId.get(linkedItemId);
		if (entry) {
			openedLinkRef.current = linkedItemId;
			handleOpen(entry, { follow: true });
			return;
		}
		// Not in the loaded list (older, archived, done or snoozed elsewhere): read it on its own.
		if (!usesExtension) return;
		openedLinkRef.current = linkedItemId;
		inboxService
			.getItem(linkedItemId)
			.then((item) => handleOpen(toInboxEntry(item), { follow: true }))
			.catch(() => toast.error(t('inbox.LOAD_ERROR')));
	}, [byId, handleOpen, isLoading, linkedItemId, t, usesExtension]);

	const byIdAction = useCallback(
		(handler: (entry: InboxEntry) => void) => (id: string) => {
			const entry = byId.get(id);
			if (entry) handler(entry);
		},
		[byId]
	);
	const onKeyDown = useInboxKeyboard({
		// `Enter` goes to the target; a click only shows the entry in the pane.
		onOpen: byIdAction((entry) => handleOpen(entry, { follow: true })),
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

	const currentPerson = current?.sentByEmployeeId ? (people.get(current.sentByEmployeeId) ?? null) : null;
	const currentTaskTitle = current?.taskId ? (taskTitles.get(current.taskId) ?? null) : null;
	const detail = (onClose?: () => void) => (
		<InboxDetail
			entry={current}
			person={currentPerson}
			taskTitle={currentTaskTitle}
			canTriage={usesExtension}
			onOpenTarget={handleOpenTarget}
			onToggleRead={handleToggleRead}
			onArchive={handleArchive}
			onSnooze={handleSnooze}
			onDone={handleDone}
			onReply={usesExtension ? handleReply : undefined}
			onClose={onClose}
		/>
	);

	return (
		<PageLayout fill title={t('inbox.TITLE')} className="p-0">
			<div className="flex h-full min-h-0">
				<section
					aria-label={t('inbox.TITLE')}
					className="flex h-full min-h-0 w-full flex-col lg:w-[28rem] lg:shrink-0 lg:border-r lg:border-border xl:w-[30rem]"
				>
					<div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-3">
						<h1 className="text-base font-semibold text-foreground">{t('inbox.TITLE')}</h1>
						<span
							className={cn(
								'rounded-full px-2 py-px text-[11px] font-medium tabular-nums',
								unreadCount > 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
							)}
						>
							{t('inbox.UNREAD_COUNT', { count: unreadCount })}
						</span>
						<span className="ms-auto flex items-center gap-0.5">
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground"
								onClick={handleMarkAll}
								disabled={unreadCount === 0 && !entries.some((entry) => entry.isUnread)}
								aria-label={t('inbox.ACTIONS.MARK_ALL_READ')}
								title={`${t('inbox.ACTIONS.MARK_ALL_READ')} (Shift+Esc)`}
							>
								<CheckDouble className="size-4" />
							</Button>
							<Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={t('notifications.SETTINGS')} title={t('notifications.SETTINGS')}>
								<Link href={NOTIFICATION_SETTINGS_HREF}>
									<Settings className="size-4" />
								</Link>
							</Button>
						</span>
					</div>

					{usesExtension && (
						<div className="shrink-0 px-4 pb-2">
							<div className="relative">
								<Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
								<input
									type="search"
									value={q}
									onChange={(event) => setQ(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Escape' && q) {
											event.stopPropagation();
											setQ('');
										}
									}}
									placeholder={t('inbox.SEARCH')}
									aria-label={t('inbox.SEARCH')}
									className="h-8 w-full rounded-lg bg-foreground/[0.04] pe-8 ps-8 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-foreground/[0.06] focus-visible:bg-transparent focus-visible:ring-[3px] focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
								/>
								{q && (
									<button
										type="button"
										onClick={() => setQ('')}
										aria-label={t('inbox.ACTIONS.CLEAR_SEARCH')}
										className="absolute end-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
									>
										<X className="size-3.5" />
									</button>
								)}
							</div>
						</div>
					)}

					<div className="flex shrink-0 items-center gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						<SegmentedControl
							items={filterItems}
							value={isSecondary ? ('' as InboxFilter) : filter}
							onValueChange={(value) => setParams({ tab: value })}
							ariaLabel={t('inbox.FILTER_LABEL')}
						/>
						<span className="ms-auto flex shrink-0 items-center gap-0.5">
							{usesExtension && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant={isSecondary ? 'secondary' : 'ghost'}
											size={isSecondary ? 'sm' : 'icon-sm'}
											className={cn(!isSecondary && 'text-muted-foreground')}
											aria-label={t('inbox.FILTERS.MORE')}
											title={t('inbox.FILTERS.MORE')}
										>
											<MoreHorizontal className="size-4" />
											{isSecondary && t(FILTER_KEYS[filter])}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
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
									<Button
										variant={sourceGroup ? 'secondary' : 'ghost'}
										size={sourceGroup ? 'sm' : 'icon-sm'}
										className={cn(!sourceGroup && 'text-muted-foreground')}
										aria-label={t('inbox.SOURCES.LABEL')}
										title={t('inbox.SOURCES.LABEL')}
									>
										<Filter className="size-4" />
										{sourceGroup && t(SOURCE_KEYS[sourceGroup])}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
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
						</span>
					</div>

					{isLegacy && <p className="mx-4 mb-2 rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs text-muted-foreground">{t('inbox.LEGACY_NOTICE')}</p>}

					{anySelected && firstSelected && (
						<div className="mx-3 mb-2 flex flex-wrap items-center gap-0.5 rounded-xl bg-primary/[0.07] py-1 pe-1 ps-3 text-[13px]">
							<span className="me-auto font-medium tabular-nums text-foreground">{t('inbox.SELECTED', { count: selectedCount })}</span>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => handleToggleRead(firstSelected)}
								aria-label={firstSelected.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')}
								title={firstSelected.isUnread ? t('notifications.MARK_READ') : t('notifications.MARK_UNREAD')}
							>
								{firstSelected.isUnread ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
							</Button>
							{usesExtension && (
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleDone(firstSelected)}
									aria-label={firstSelected.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')}
									title={firstSelected.isDone ? t('inbox.ACTIONS.NOT_DONE') : t('inbox.ACTIONS.DONE')}
								>
									<Check className="size-4" />
								</Button>
							)}
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => handleArchive(firstSelected)}
								aria-label={firstSelected.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')}
								title={firstSelected.isArchived ? t('inbox.ACTIONS.UNARCHIVE') : t('notifications.ARCHIVE')}
							>
								<Archive className="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => setSelected(new Set())}
								aria-label={t('inbox.ACTIONS.CLEAR_SELECTION')}
								title={t('inbox.ACTIONS.CLEAR_SELECTION')}
							>
								<X className="size-4" />
							</Button>
						</div>
					)}

					<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain hairline-t border-border" onKeyDown={onKeyDown} aria-live="polite" aria-busy={isLoading}>
						{isLoading && <NotificationRowsSkeleton rows={8} />}
						{isError && <NotificationErrorState message={t('inbox.LOAD_ERROR')} retryLabel={t('inbox.RETRY')} onRetry={() => retry()} />}
						{showsList && entries.length === 0 && (
							<div className="flex h-full min-h-64 items-center justify-center">
								<NotificationEmptyState icon={emptyCopy.icon} title={t(emptyCopy.title)} message={t(emptyCopy.text)} />
							</div>
						)}
						{showsList &&
							groups.map((group) => (
								<section key={group.day} className="px-2 pb-1" aria-label={t(GROUP_KEYS[group.day])}>
									<h2 className="sticky top-0 z-[1] bg-background/95 px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
										{t(GROUP_KEYS[group.day])}
									</h2>
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
				</section>

				{/* Below the large breakpoint the pane is a sheet over the list, opened with an entry that is answered here (a
				    question, an approval); the other entries open their target as before. */}
				{current?.decision && (
					<div
						className="fixed inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-lg lg:hidden"
						role="dialog"
						aria-label={t('inbox.DETAIL.SHEET_LABEL')}
					>
						{detail(() => setCurrentId(null))}
					</div>
				)}
				<aside className="hidden h-full min-w-0 flex-1 lg:block">{detail()}</aside>
			</div>
		</PageLayout>
	);
}
