'use client';

import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { inboxService } from '@/core/services/client/api/inbox';
import { EInboxTab, IInboxItemPage } from '@/core/types/interfaces/common/inbox-item';
import { InboxEntry, InboxFilter, InboxSourceGroup, filterInboxEntries, tabOfFilter, toInboxEntry } from '@/core/lib/utils/inbox-entry';
import { InboxScope, useInboxScope } from './use-inbox-scope';

/** The counts badge refreshes on this cadence while the tab is visible (the live channel refetches it sooner). */
const COUNTS_POLL_MS = 60_000;
const ITEMS_STALE_MS = 15_000;

export interface InboxListSelection {
	filter: InboxFilter;
	sourceGroup: InboxSourceGroup | null;
	q: string;
}

/** The query the platform is asked for a selection: the tab, and unread-only for the Unread filter. */
export function queryOfSelection(selection: InboxListSelection): { tab: EInboxTab; unread?: boolean; q?: string } {
	return {
		tab: tabOfFilter(selection.filter),
		...(selection.filter === 'unread' ? { unread: true } : {}),
		...(selection.q.trim() ? { q: selection.q.trim() } : {})
	};
}

export function itemsKeyOf(scope: InboxScope | null, selection: InboxListSelection) {
	return queryKeys.inbox.items(scope?.tenantId, scope?.organizationId, scope?.userId, JSON.stringify(queryOfSelection(selection)));
}

export function countsKeyOf(scope: InboxScope | null) {
	return queryKeys.inbox.counts(scope?.tenantId, scope?.organizationId, scope?.userId);
}

/**
 * The pages of the caller's inbox for a selection, as entries, newest first. The platform filters by tab (and
 * unread); the type (mentions, assigned) and source filters narrow each page on the client.
 */
export function useInboxItems(selection: InboxListSelection, enabled: boolean) {
	const scope = useInboxScope();
	const query = useMemo(() => queryOfSelection(selection), [selection]);
	const queryKey = itemsKeyOf(scope, selection);

	const pages = useInfiniteQuery({
		queryKey,
		queryFn: ({ signal, pageParam }) => inboxService.list({ ...query, cursor: pageParam || undefined }, signal),
		initialPageParam: '' as string,
		getNextPageParam: (lastPage: IInboxItemPage) => lastPage.nextCursor ?? undefined,
		enabled: enabled && scope !== null,
		staleTime: ITEMS_STALE_MS
	});

	const entries = useMemo(() => {
		const items = pages.data?.pages.flatMap((page) => page.items) ?? [];
		return filterInboxEntries(items.map(toInboxEntry), selection.filter, selection.sourceGroup);
	}, [pages.data, selection.filter, selection.sourceGroup]);

	return {
		entries,
		queryKey,
		isLoading: pages.isPending && pages.fetchStatus !== 'idle',
		isError: pages.isError,
		hasNextPage: !!pages.hasNextPage,
		isFetchingNextPage: pages.isFetchingNextPage,
		fetchNextPage: pages.fetchNextPage,
		retry: pages.refetch
	};
}

/** My unread count (the badge), polled while the tab is visible. */
export function useInboxCounts(enabled: boolean) {
	const scope = useInboxScope();
	const counts = useQuery({
		queryKey: countsKeyOf(scope),
		queryFn: ({ signal }) => inboxService.counts(signal),
		enabled: enabled && scope !== null,
		staleTime: COUNTS_POLL_MS / 2,
		refetchInterval: COUNTS_POLL_MS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true
	});
	return { unread: counts.data?.unread ?? 0, decisionsOpen: counts.data?.decisionsOpen ?? 0 };
}

export type { InboxEntry };
