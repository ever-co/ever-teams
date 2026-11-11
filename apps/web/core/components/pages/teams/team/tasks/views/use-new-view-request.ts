'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';

const TEAM_TASKS_PATH = '/team/tasks';
const NEW_VIEW_PARAM = 'saveView';

/** Where "New view" of the views index leads: the team's tasks, where a view's filters are set, to name it. */
export const NEW_VIEW_PATH = `${TEAM_TASKS_PATH}?${NEW_VIEW_PARAM}=1`;

/**
 * Whether the team's tasks were opened by "New view", for the dialog that names the view to start open. The
 * parameter goes at once, while the dialog shows: a reload does not open the dialog again, and closing it never
 * navigates, so the page of a view just created stays.
 */
export function useNewViewRequest(isViewPage: boolean): boolean {
	const router = useRouter();
	const searchParams = useSearchParams();
	const isRequested = !isViewPage && searchParams?.get(NEW_VIEW_PARAM) === '1' && isTaskViewsEnabled();

	useEffect(() => {
		if (isRequested) {
			router.replace(TEAM_TASKS_PATH);
		}
	}, [isRequested, router]);

	return isRequested;
}
