'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { tasksByTeamState, teamTasksCompleteState, teamTasksPagesLoadingState } from '@/core/stores';

/**
 * Tells a list that has not arrived yet from a list that arrived empty, for views of the team's tasks. Before the
 * shell starts reading the pages nothing is loading, yet nothing has been read either: the list is known once it
 * holds tasks, once every page is in, or once a page read has started and stopped (an error included).
 */
export function useTeamTasksLoadState() {
	const tasks = useAtomValue(tasksByTeamState);
	const tasksComplete = useAtomValue(teamTasksCompleteState);
	const pagesLoading = useAtomValue(teamTasksPagesLoadingState);
	const [hasSeenPagesLoading, setHasSeenPagesLoading] = useState(pagesLoading);

	const startsLoadingNow = pagesLoading && !hasSeenPagesLoading;
	if (startsLoadingNow) {
		setHasSeenPagesLoading(true);
	}

	const hasTasks = tasks.length > 0;
	const hasStoppedLoading = hasSeenPagesLoading && !pagesLoading;
	const isListKnown = hasTasks || tasksComplete || hasStoppedLoading;
	const isFirstLoad = !isListKnown;
	const isLoadingMorePages = hasTasks && pagesLoading;

	return { isFirstLoad, isLoadingMorePages };
}
