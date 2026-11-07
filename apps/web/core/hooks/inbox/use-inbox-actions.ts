'use client';

import { useCallback } from 'react';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { inboxService } from '@/core/services/client/api/inbox';
import { IInboxItem, IInboxItemPage, IInboxStateInput } from '@/core/types/interfaces/common/inbox-item';
import { matchesInboxFilter, tabOfFilter, toInboxEntry } from '@/core/lib/utils/inbox-entry';
import { InboxListSelection, queryOfSelection } from './use-inbox-items';
import { useInboxScope } from './use-inbox-scope';

type Pages = InfiniteData<IInboxItemPage, string>;

/** How many state requests run at once for a multi-item action. */
const CONCURRENCY = 8;
/** The pages Mark all read reads to know exactly which items it changes (the undo puts back exactly those). */
const MARK_ALL_MAX_PAGES = 20;
const MARK_ALL_PAGE_SIZE = 100;

/** A multi-item action that the platform refused for some of its items. */
export class InboxActionError extends Error {
	constructor(
		readonly failed: number,
		readonly total: number
	) {
		super(`${failed} of ${total} inbox changes failed`);
	}
}

/** Runs `run` for every id, a few at a time, and answers the ids it failed for — after every one settled. */
async function runEach(ids: readonly string[], run: (id: string) => Promise<unknown>): Promise<string[]> {
	const failed: string[] = [];
	let next = 0;
	const worker = async () => {
		while (next < ids.length) {
			const id = ids[next++];
			try {
				await run(id);
			} catch {
				failed.push(id);
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
	return failed;
}

/**
 * The fields a refused change touched, put back to what they were before it — and only those, so a newer change
 * that succeeded meanwhile (an archive while a read was pending) stays.
 */
function revertFields(item: IInboxItem, before: IInboxItem | undefined, input: IInboxStateInput): IInboxItem {
	if (!before) return item;
	const was = (before.recipient ?? { isRead: false }) as NonNullable<IInboxItem['recipient']>;
	const recipient = { isRead: false, ...(item.recipient ?? {}) } as NonNullable<IInboxItem['recipient']>;
	if (typeof input.isRead === 'boolean' || input.isDone) {
		recipient.isRead = was.isRead;
		recipient.readAt = was.readAt ?? null;
	}
	if (typeof input.isArchived === 'boolean') {
		recipient.isArchived = was.isArchived ?? false;
		recipient.archivedAt = was.archivedAt ?? null;
	}
	if (input.snoozedUntil !== undefined) recipient.snoozedUntil = was.snoozedUntil ?? null;
	if (typeof input.isDone === 'boolean') {
		recipient.isDone = was.isDone ?? false;
		recipient.doneAt = was.doneAt ?? null;
	}
	return { ...item, recipient };
}

/** What Mark all read did: how many it changed, and the undo when it knows exactly which. */
export interface InboxMarkAllResult {
	count: number;
	/** Whether a filter, a source or a search narrowed it (the toast says how many rather than "all"). */
	scoped: boolean;
	undo: (() => Promise<void>) | null;
}

/** The recipient state after a change, as the page shows it before the platform answers. */
function withState(item: IInboxItem, input: IInboxStateInput, now: string): IInboxItem {
	const recipient = { isRead: false, ...(item.recipient ?? {}) };
	if (typeof input.isRead === 'boolean') {
		recipient.isRead = input.isRead;
		recipient.readAt = input.isRead ? (recipient.readAt ?? now) : null;
	}
	if (typeof input.isArchived === 'boolean') {
		recipient.isArchived = input.isArchived;
		recipient.archivedAt = input.isArchived ? (recipient.archivedAt ?? now) : null;
	}
	if (input.snoozedUntil !== undefined) {
		recipient.snoozedUntil = input.snoozedUntil;
	}
	if (typeof input.isDone === 'boolean') {
		recipient.doneAt = input.isDone ? (recipient.doneAt ?? now) : null;
		recipient.isDone = input.isDone;
		if (input.isDone && !recipient.isRead) {
			recipient.isRead = true;
			recipient.readAt = now;
		}
	}
	return { ...item, recipient };
}

/**
 * Read, unread, archive, snooze and done, applied to every cached page at once; what the platform refuses is put
 * back item by item once every request settled. Mark all read changes exactly the unread items of the list as it
 * is filtered, and its undo puts back exactly those.
 */
export function useInboxActions() {
	const scope = useInboxScope();
	const queryClient = useQueryClient();

	const snapshot = useCallback(async () => {
		await queryClient.cancelQueries({ queryKey: queryKeys.inbox.all });
		return queryClient.getQueriesData<Pages>({ queryKey: ['inbox', 'items'] });
	}, [queryClient]);

	/** Puts back what the refused changes touched on the failed items, from the snapshot taken before them. */
	const revert = useCallback(
		(failedIds: readonly string[], previous: Array<[readonly unknown[], Pages | undefined]>, input: IInboxStateInput) => {
			const before = new Map<string, IInboxItem>();
			for (const [, data] of previous) for (const page of data?.pages ?? []) for (const item of page.items) before.set(item.id, item);
			const failed = new Set(failedIds);
			queryClient.setQueriesData<Pages>({ queryKey: ['inbox', 'items'] }, (data) => {
				if (!data) return data;
				return {
					...data,
					pages: data.pages.map((page) => ({
						...page,
						items: page.items.map((item) => (failed.has(item.id) ? revertFields(item, before.get(item.id), input) : item))
					}))
				};
			});
		},
		[queryClient]
	);

	const settle = useCallback(() => queryClient.invalidateQueries({ queryKey: queryKeys.inbox.all }), [queryClient]);

	/** Applies a state change to every cached page: the item changes, or leaves a list it no longer belongs to. */
	const applyLocally = useCallback(
		(ids: readonly string[], input: IInboxStateInput) => {
			const now = new Date().toISOString();
			const wanted = new Set(ids);
			queryClient.setQueriesData<Pages>({ queryKey: ['inbox', 'items'] }, (data) => {
				if (!data) return data;
				return {
					...data,
					pages: data.pages.map((page) => ({
						...page,
						items: page.items.map((item) => (wanted.has(item.id) ? withState(item, input, now) : item))
					}))
				};
			});
			// Unread badge: the count follows the change as best the client knows.
			const countsKey = queryKeys.inbox.counts(scope?.tenantId, scope?.organizationId, scope?.userId);
			if (typeof input.isRead === 'boolean' || input.isArchived || input.isDone || input.snoozedUntil) {
				void queryClient.invalidateQueries({ queryKey: countsKey });
			}
		},
		[queryClient, scope?.organizationId, scope?.tenantId, scope?.userId]
	);

	const setState = useCallback(
		async (ids: readonly string[], input: IInboxStateInput) => {
			if (!ids.length) return;
			const previous = await snapshot();
			applyLocally(ids, input);
			// Every request settles before anything is put back or refetched: a refetch while another request is still
			// in flight would show its item in its old state.
			const failed = await runEach(ids, (id) => inboxService.setState(id, input));
			if (failed.length) revert(failed, previous, input);
			void settle();
			if (failed.length) throw new InboxActionError(failed.length, ids.length);
		},
		[applyLocally, revert, settle, snapshot]
	);

	/** The unread items of a list as it is filtered (its tab, search, type and source), up to the page budget. */
	const unreadIdsOf = useCallback(async (selection: InboxListSelection): Promise<{ ids: string[]; complete: boolean }> => {
		const query = { ...queryOfSelection(selection), unread: true, limit: MARK_ALL_PAGE_SIZE };
		const ids: string[] = [];
		let cursor: string | undefined;
		let pages = 0;
		do {
			const page = await inboxService.list({ ...query, cursor });
			for (const item of page.items) {
				const entry = toInboxEntry(item);
				if (entry.isUnread && matchesInboxFilter(entry, selection.filter, selection.sourceGroup)) ids.push(item.id);
			}
			cursor = page.nextCursor ?? undefined;
			pages += 1;
		} while (cursor && pages < MARK_ALL_MAX_PAGES);
		return { ids, complete: !cursor };
	}, []);

	const markAllRead = useCallback(
		async (selection: InboxListSelection): Promise<InboxMarkAllResult> => {
			const q = selection.q.trim();
			// The type filters and the source groups are the app's own narrowing: the platform's bulk route cannot state
			// them, so those lists are marked item by item.
			const narrowedHere = !!selection.sourceGroup || selection.filter === 'mentions' || selection.filter === 'assigned';
			const scoped = narrowedHere || !!q || (selection.filter !== 'all' && selection.filter !== 'unread');
			const { ids, complete } = await unreadIdsOf(selection);
			const undo = (changed: readonly string[]) => (changed.length ? async () => setState(changed, { isRead: false }) : null);
			if (narrowedHere) {
				await setState(ids, { isRead: true });
				return { count: ids.length, scoped, undo: undo(ids) };
			}
			const previous = await snapshot();
			applyLocally(ids, { isRead: true });
			try {
				const answer = await inboxService.markAllRead({ tab: tabOfFilter(selection.filter), ...(q ? { q } : {}) });
				// The undo puts back exactly what was unread; past the page budget the set is not known, so none is offered.
				return { count: answer?.updated ?? ids.length, scoped, undo: complete ? undo(ids) : null };
			} catch (error) {
				revert(ids, previous, { isRead: true });
				throw error;
			} finally {
				void settle();
			}
		},
		[applyLocally, revert, setState, settle, snapshot, unreadIdsOf]
	);

	return { setState, markAllRead };
}
