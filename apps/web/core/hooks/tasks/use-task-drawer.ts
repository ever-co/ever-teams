'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { taskDrawerState } from '@/core/stores/tasks/task-drawer';

const TASK_PAGE_PREFIX = '/task/';

function isOnTaskPage(pathname: string | null) {
	const path = pathname ?? '';
	const segments = path.split('/').filter(Boolean);
	const taskIndex = segments.indexOf('task');
	return taskIndex >= 0 && taskIndex <= 1;
}

/**
 * Opens a task in the app's task drawer. On a task page it navigates instead: that page and the timer read the
 * same detailed-task state the drawer fills, so a drawer there would replace the task on screen.
 */
export function useTaskDrawer() {
	const setDrawer = useSetAtom(taskDrawerState);
	const router = useRouter();
	const pathname = usePathname();

	const openTaskDrawer = useCallback(
		(taskId: string, sequence: string[] = []) => {
			if (isOnTaskPage(pathname)) {
				router.push(`${TASK_PAGE_PREFIX}${taskId}`);
				return;
			}
			setDrawer({ taskId, isOpen: true, sequence, openedOn: pathname });
		},
		[pathname, router, setDrawer]
	);

	/** Shows another task of the same list in the open drawer, keeping the list for the arrows. */
	const showTaskInDrawer = useCallback(
		(taskId: string) => {
			setDrawer((current) => ({ ...current, taskId }));
		},
		[setDrawer]
	);

	const closeTaskDrawer = useCallback(() => {
		setDrawer((current) => ({ ...current, isOpen: false }));
	}, [setDrawer]);

	return { openTaskDrawer, showTaskInDrawer, closeTaskDrawer };
}
