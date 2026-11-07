'use client';

import { useCallback } from 'react';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { inboxService } from '@/core/services/client/api/inbox';
import { IInboxItem, IInboxItemPage, IInboxStateInput } from '@/core/types/interfaces/common/inbox-item';
import { InboxFilter, tabOfFilter } from '@/core/lib/utils/inbox-entry';
import { useInboxScope } from './use-inbox-scope';

type Pages = InfiniteData<IInboxItemPage, string>;

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
 * Read, unread, archive, snooze and done, applied to every cached page at once and rolled back if the platform
 * refuses; mark-all-read with an undo that puts the unread ones back.
 */
export function useInboxActions() {
	const scope = useInboxScope();
	const queryClient = useQueryClient();

	const snapshot = useCallback(async () => {
		await queryClient.cancelQueries({ queryKey: queryKeys.inbox.all });
		return queryClient.getQueriesData<Pages>({ queryKey: ['inbox', 'items'] });
	}, [queryClient]);

	const restore = useCallback(
		(previous: Array<[readonly unknown[], Pages | undefined]>) => {
			for (const [key, data] of previous) queryClient.setQueryData(key, data);
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
			try {
				await Promise.all(ids.map((id) => inboxService.setState(id, input)));
			} catch (error) {
				restore(previous);
				throw error;
			} finally {
				void settle();
			}
		},
		[applyLocally, restore, settle, snapshot]
	);

	const markAllRead = useCallback(
		async (filter: InboxFilter) => {
			const previous = await snapshot();
			// The ids that were unread, for the undo.
			const unreadIds = new Set<string>();
			for (const [, data] of previous) {
				for (const page of data?.pages ?? []) for (const item of page.items) if (item.recipient?.isRead !== true) unreadIds.add(item.id);
			}
			applyLocally([...unreadIds], { isRead: true });
			try {
				await inboxService.markAllRead({ tab: tabOfFilter(filter) });
			} catch (error) {
				restore(previous);
				throw error;
			} finally {
				void settle();
			}
			return {
				undo: async () => {
					if (!unreadIds.size) return;
					await setState([...unreadIds], { isRead: false });
				}
			};
		},
		[applyLocally, restore, setState, settle, snapshot]
	);

	return { setState, markAllRead };
}
