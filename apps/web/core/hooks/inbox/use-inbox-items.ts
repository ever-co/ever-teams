'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { inboxService } from '@/core/services/client/api/inbox';
import { EInboxTab, IInboxItemPage } from '@/core/types/interfaces/common/inbox-item';
import { InboxEntry, InboxFilter, InboxSourceGroup, filterInboxEntries, tabOfFilter, toInboxEntry } from '@/core/lib/utils/inbox-entry';
import { InboxScope, useInboxScope } from './use-inbox-scope';

/** The longest delay a timer takes (a snooze further out is looked at again when the page next renders). */
const MAX_TIMER_MS = 2_147_000_000;

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

	// A snooze that runs out while the page is open: the lists are recomputed (and refetched) at that moment, so the
	// entry leaves Snoozed and comes back to its list without a reload.
	const queryClient = useQueryClient();
	const [clock, setClock] = useState(0);
	useEffect(() => {
		const now = Date.now();
		let next = Number.POSITIVE_INFINITY;
		for (const page of pages.data?.pages ?? []) {
			for (const item of page.items) {
				const until = item.recipient?.snoozedUntil ? Date.parse(item.recipient.snoozedUntil) : Number.NaN;
				if (until > now && until < next) next = until;
			}
		}
		if (!Number.isFinite(next)) return;
		const timer = setTimeout(() => {
			setClock((value) => value + 1);
			void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all });
		}, Math.min(next - now + 50, MAX_TIMER_MS));
		return () => clearTimeout(timer);
	}, [clock, pages.data, queryClient]);

	const entries = useMemo(() => {
		const items = pages.data?.pages.flatMap((page) => page.items) ?? [];
		return filterInboxEntries(items.map(toInboxEntry), selection.filter, selection.sourceGroup);
		// `clock` moves when a snooze runs out: the filters compare against the time of this computation.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pages.data, selection.filter, selection.sourceGroup, clock]);

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

/**
 * One item of the caller's inbox as the platform holds it: the entry the detail pane keeps after it left the list (an
 * unread entry, read in the Unread tab).
 *
 * It sits under the inbox's own key, so it is refetched whenever the lists are (a live event, the window regaining
 * focus). A copy kept by the page would never hear that another tab answered or closed a decision.
 *
 * A read that started before an action on the item settled may answer with what the item was before it; React Query
 * keeps such a read rather than start a second one while the first load is in flight. So the page calls `refresh` once
 * each action settles: it drops any read on its way and reads again, and only that newer answer counts.
 *
 * @param id The held item, or `null` when the pane holds nothing out of the list.
 * @returns The item as an entry once read; `patch`, which mirrors a local change on it until the next read; and
 * `refresh`, which reads it again from scratch (both act on the item held when they are called, not when they were
 * created).
 */
export function useInboxItem(id: string | null) {
	const scope = useInboxScope();
	const queryClient = useQueryClient();
	const tenantId = scope?.tenantId;
	const organizationId = scope?.organizationId;
	const userId = scope?.userId;
	const queryKey = useMemo(
		() => queryKeys.inbox.item(tenantId, organizationId, userId, id),
		[tenantId, organizationId, userId, id]
	);

	const item = useQuery({
		queryKey,
		queryFn: async ({ signal }) => toInboxEntry(await inboxService.getItem(id as string, signal)),
		enabled: !!id && scope !== null,
		staleTime: 0,
		// The app turns this off for every query; without a live connection, returning to the tab is when the pane
		// learns that another tab answered or closed the decision.
		refetchOnWindowFocus: true,
		retry: false
	});

	// The item held now, for callbacks created before it was (opening an entry starts its action before the entry
	// leaves the list and becomes the held one).
	const latest = useRef<{ id: string | null; queryKey: typeof queryKey }>({ id, queryKey });
	useEffect(() => {
		latest.current = { id, queryKey };
	}, [id, queryKey]);

	const patch = useCallback(
		async (ids: readonly string[], change: Partial<InboxEntry>) => {
			const held = latest.current;
			if (!held.id || !ids.includes(held.id)) return;
			// A read still on its way would land after the change and put the old state back.
			await queryClient.cancelQueries({ queryKey: held.queryKey });
			queryClient.setQueryData<InboxEntry>(held.queryKey, (entry) => (entry ? { ...entry, ...change } : entry));
		},
		[queryClient]
	);

	const refresh = useCallback(async () => {
		const held = latest.current;
		if (!held.id) return;
		await queryClient.cancelQueries({ queryKey: held.queryKey });
		await queryClient.invalidateQueries({ queryKey: held.queryKey });
	}, [queryClient]);

	return { data: id && item.data?.id === id ? item.data : undefined, patch, refresh };
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
