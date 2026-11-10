'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { employeeNotificationService, INotificationInboxScope } from '@/core/services/client/api/notifications';
import { NotificationEntry, toNotificationEntry } from '@/core/lib/utils/notification-inbox';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	IEmployeeNotification,
	IEmployeeNotificationUpdateInput
} from '@/core/types/interfaces/common/employee-notification';
import { useAtomValue } from 'jotai';
import { realtimePausesPollingAtom } from '@/core/stores/common/realtime';
import { useNotificationScope } from './use-notification-scope';

/** The badge is one light request; the list loads only while the inbox is open. */
const UNREAD_COUNT_POLL_MS = 60_000;
const INBOX_STALE_MS = 15_000;

type InboxPage = PaginationResponse<IEmployeeNotification>;

const NO_ENTRIES: NotificationEntry[] = [];

async function fetchUnreadCount(scope: INotificationInboxScope | null, signal: AbortSignal): Promise<number> {
	if (!scope) {
		return 0;
	}

	return employeeNotificationService.getUnreadCount(scope, signal);
}

async function fetchInbox(scope: INotificationInboxScope | null, signal: AbortSignal): Promise<InboxPage> {
	if (!scope) {
		return { items: [], total: 0 };
	}

	return employeeNotificationService.getInbox(scope, signal);
}

function inboxKeyOf(scope: INotificationInboxScope | null) {
	return queryKeys.notifications.inbox(scope?.tenantId, scope?.organizationId, scope?.receiverEmployeeId);
}

function unreadCountKeyOf(scope: INotificationInboxScope | null) {
	return queryKeys.notifications.unreadCount(scope?.tenantId, scope?.organizationId, scope?.receiverEmployeeId);
}

export function useUnreadNotificationCount() {
	const scope = useNotificationScope();
	// Where the live channel replaces the polls (`realtimePausesPollingAtom`), it announces every new notification:
	// the poll is redundant and pauses; it resumes the moment the connection drops.
	const realtimeConnected = useAtomValue(realtimePausesPollingAtom);

	const countQuery = useQuery({
		queryKey: unreadCountKeyOf(scope),
		queryFn: ({ signal }) => fetchUnreadCount(scope, signal),
		enabled: scope !== null,
		staleTime: UNREAD_COUNT_POLL_MS / 2,
		refetchInterval: realtimeConnected ? false : UNREAD_COUNT_POLL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true
	});

	return countQuery.data ?? 0;
}

export function useNotificationInbox(isOpen: boolean) {
	const scope = useNotificationScope();

	const inboxQuery = useQuery({
		queryKey: inboxKeyOf(scope),
		queryFn: ({ signal }) => fetchInbox(scope, signal),
		enabled: isOpen && scope !== null,
		staleTime: INBOX_STALE_MS
	});

	const entries = useMemo(() => {
		const items = inboxQuery.data?.items;
		if (!items) {
			return NO_ENTRIES;
		}

		return items.map(toNotificationEntry);
	}, [inboxQuery.data]);

	const total = inboxQuery.data?.total ?? 0;
	const hasMoreThanLoaded = total > entries.length;

	return {
		entries,
		hasMoreThanLoaded,
		isLoading: inboxQuery.isPending && inboxQuery.fetchStatus !== 'idle',
		isError: inboxQuery.isError,
		retry: inboxQuery.refetch
	};
}

interface PatchVariables {
	id: string;
	patch: IEmployeeNotificationUpdateInput;
}

function applyPatchToPage(page: InboxPage | undefined, variables: PatchVariables): InboxPage | undefined {
	if (!page) {
		return page;
	}
	const isRemoval = variables.patch.isArchived === true;
	if (isRemoval) {
		const items = page.items.filter((item) => item.id !== variables.id);
		const removedCount = page.items.length - items.length;

		return { items, total: page.total - removedCount };
	}
	const items = page.items.map((item) => {
		if (item.id !== variables.id) {
			return item;
		}

		return { ...item, ...variables.patch };
	});

	return { ...page, items };
}

function wasUnread(page: InboxPage | undefined, id: string): boolean {
	const item = page?.items.find((candidate) => candidate.id === id);
	if (!item) {
		return false;
	}

	return item.isRead !== true;
}

function unreadDeltaOf(page: InboxPage | undefined, variables: PatchVariables): number {
	const previouslyUnread = wasUnread(page, variables.id);
	const { isRead, isArchived } = variables.patch;
	const becomesRead = isRead === true;
	const leavesInbox = isArchived === true;
	const becomesUnread = isRead === false;
	const leavesUnreadState = becomesRead || leavesInbox;
	if (previouslyUnread && leavesUnreadState) {
		return -1;
	}
	if (!previouslyUnread && becomesUnread) {
		return 1;
	}

	return 0;
}

function readAtFor(isRead: boolean): string | null {
	if (!isRead) {
		return null;
	}

	return new Date().toISOString();
}

function markEveryItemRead(page: InboxPage | undefined, readAt: string): InboxPage | undefined {
	if (!page) {
		return page;
	}
	const items = page.items.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? readAt }));

	return { ...page, items };
}

/** Read, unread, archive and mark-all, applied to the cached inbox at once and rolled back if Gauzy refuses. */
export function useNotificationActions() {
	const scope = useNotificationScope();
	const queryClient = useQueryClient();
	const inboxKey = inboxKeyOf(scope);
	const countKey = unreadCountKeyOf(scope);

	const snapshot = useCallback(async () => {
		await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
		const page = queryClient.getQueryData<InboxPage>(inboxKey);
		const count = queryClient.getQueryData<number>(countKey);

		return { page, count };
	}, [countKey, inboxKey, queryClient]);

	const restore = useCallback(
		(previous: { page: InboxPage | undefined; count: number | undefined } | undefined) => {
			if (!previous) {
				return;
			}
			queryClient.setQueryData(inboxKey, previous.page);
			queryClient.setQueryData(countKey, previous.count);
		},
		[countKey, inboxKey, queryClient]
	);

	const settle = useCallback(() => {
		return queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
	}, [queryClient]);

	const patchMutation = useMutation({
		mutationFn: ({ id, patch }: PatchVariables) => employeeNotificationService.update(id, patch),
		onMutate: async (variables: PatchVariables) => {
			const previous = await snapshot();
			const delta = unreadDeltaOf(previous.page, variables);
			queryClient.setQueryData<InboxPage | undefined>(inboxKey, (page) => applyPatchToPage(page, variables));
			queryClient.setQueryData<number>(countKey, (count) => Math.max(0, (count ?? 0) + delta));

			return previous;
		},
		onError: (_error, _variables, previous) => restore(previous),
		onSettled: settle
	});

	const markAllMutation = useMutation({
		mutationFn: () => employeeNotificationService.markAllAsRead(),
		onMutate: async () => {
			const previous = await snapshot();
			const readAt = new Date().toISOString();
			queryClient.setQueryData<InboxPage | undefined>(inboxKey, (page) => markEveryItemRead(page, readAt));
			queryClient.setQueryData<number>(countKey, 0);

			return previous;
		},
		onError: (_error, _variables, previous) => restore(previous),
		onSettled: settle
	});

	const { mutateAsync: patchAsync } = patchMutation;

	const setRead = useCallback(
		(id: string, isRead: boolean) => {
			return patchAsync({ id, patch: { isRead, readAt: readAtFor(isRead) } });
		},
		[patchAsync]
	);

	const archive = useCallback(
		(id: string) => {
			const now = new Date().toISOString();

			return patchAsync({ id, patch: { isArchived: true, archivedAt: now, isRead: true, readAt: now } });
		},
		[patchAsync]
	);

	const unarchive = useCallback(
		(id: string) => {
			return patchAsync({ id, patch: { isArchived: false, archivedAt: null } });
		},
		[patchAsync]
	);

	return {
		setRead,
		archive,
		unarchive,
		markAllAsRead: markAllMutation.mutateAsync,
		isMarkingAll: markAllMutation.isPending
	};
}
