'use client';

import { type RefObject, useCallback, useState } from 'react';

export interface RunConflictFilter {
	/** The run whose conflicts the list shows; null: every run. Never a run of another connection. */
	runId: string | null;
	/** A run's count in the runs list: the list narrows to that run, scrolls into view and takes the focus. */
	showRun: (runId: string) => void;
	clearRun: () => void;
}

/**
 * The run filter of a connection's conflict list, around the list's focusable container (`tabIndex={-1}`). It belongs
 * to the connection it was set on: another connection (another organization, a reconnect) starts with every run.
 */
export function useRunConflictFilter(
	integrationId: string | null,
	listRef: RefObject<HTMLElement | null>
): RunConflictFilter {
	const [filter, setFilter] = useState<{ integrationId: string | null; runId: string | null }>({
		integrationId: null,
		runId: null
	});
	const runId = filter.integrationId === integrationId ? filter.runId : null;
	const showRun = useCallback(
		(next: string) => {
			setFilter({ integrationId, runId: next });
			const element = listRef.current;
			element?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
			// A keyboard user lands on the list, not on the count below it.
			element?.focus?.({ preventScroll: true });
		},
		[integrationId, listRef]
	);
	const clearRun = useCallback(() => setFilter({ integrationId, runId: null }), [integrationId]);
	return { runId, showRun, clearRun };
}
