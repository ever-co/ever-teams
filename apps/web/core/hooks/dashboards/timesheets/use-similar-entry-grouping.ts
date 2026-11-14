'use client';

import { useCallback, useState } from 'react';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';

export const GROUP_SIMILAR_ENTRIES_STORAGE_KEY = 'timesheets-group-similar-entries';

const NO_OPEN_GROUPS: ReadonlySet<string> = new Set();

/**
 * Whether the Timesheets list shows similar entries of a day as one row (on unless the reader turned it off in this
 * browser), and which of those rows are open on their entries (closed on every visit).
 */
export function useSimilarEntryGrouping() {
	const [storedChoice, setStoredChoice] = useLocalStorageState<unknown>(GROUP_SIMILAR_ENTRIES_STORAGE_KEY, true);
	const [openGroupKeys, setOpenGroupKeys] = useState<ReadonlySet<string>>(NO_OPEN_GROUPS);

	const isGrouping = storedChoice !== false;

	const setIsGrouping = useCallback(
		(nextIsGrouping: boolean) => {
			setStoredChoice(nextIsGrouping);
		},
		[setStoredChoice]
	);

	const toggleGroup = useCallback((groupKey: string) => {
		setOpenGroupKeys((current) => {
			const next = new Set(current);
			if (next.has(groupKey)) {
				next.delete(groupKey);
				return next;
			}
			next.add(groupKey);
			return next;
		});
	}, []);

	const isGroupOpen = useCallback((groupKey: string) => openGroupKeys.has(groupKey), [openGroupKeys]);

	return { isGrouping, setIsGrouping, isGroupOpen, toggleGroup };
}

export type SimilarEntryGrouping = ReturnType<typeof useSimilarEntryGrouping>;
