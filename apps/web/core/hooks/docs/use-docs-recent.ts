'use client';

import { useCallback, useEffect, useState } from 'react';
import { forgetRecent, localStorageOrNull, readExpanded, readRecent, rememberRecent, writeExpanded } from '@/core/lib/utils/docs-recent';
import { useDocsScope } from './use-docs-scope';

/** The pages last opened on this device, for the Recent section and the page `/docs` opens with. */
export function useDocsRecent() {
	const scope = useDocsScope();
	const organizationId = scope?.organizationId ?? null;
	const [recentIds, setRecentIds] = useState<string[]>([]);

	useEffect(() => {
		setRecentIds(organizationId ? readRecent(localStorageOrNull(), organizationId) : []);
	}, [organizationId]);

	const remember = useCallback(
		(pageId: string) => {
			if (!organizationId) return;
			setRecentIds(rememberRecent(localStorageOrNull(), organizationId, pageId));
		},
		[organizationId]
	);

	const forget = useCallback(
		(pageId: string) => {
			if (!organizationId) return;
			setRecentIds(forgetRecent(localStorageOrNull(), organizationId, pageId));
		},
		[organizationId]
	);

	return { recentIds, remember, forget };
}

/** Which tree nodes are open, kept per organization on this device. */
export function useDocsExpanded() {
	const scope = useDocsScope();
	const organizationId = scope?.organizationId ?? null;
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		setExpanded(organizationId ? readExpanded(localStorageOrNull(), organizationId) : new Set());
	}, [organizationId]);

	const update = useCallback(
		(change: (current: Set<string>) => Set<string>) => {
			setExpanded((current) => {
				const next = change(current);
				if (organizationId) writeExpanded(localStorageOrNull(), organizationId, next);
				return next;
			});
		},
		[organizationId]
	);

	const toggle = useCallback(
		(pageId: string) =>
			update((current) => {
				const next = new Set(current);
				if (next.has(pageId)) next.delete(pageId);
				else next.add(pageId);
				return next;
			}),
		[update]
	);

	const expandAll = useCallback(
		(pageIds: readonly string[]) =>
			update((current) => {
				if (pageIds.every((id) => current.has(id))) return current;
				const next = new Set(current);
				for (const id of pageIds) next.add(id);
				return next;
			}),
		[update]
	);

	const setOpen = useCallback(
		(pageId: string, open: boolean) =>
			update((current) => {
				if (current.has(pageId) === open) return current;
				const next = new Set(current);
				if (open) next.add(pageId);
				else next.delete(pageId);
				return next;
			}),
		[update]
	);

	return { expanded, toggle, expandAll, setOpen };
}
