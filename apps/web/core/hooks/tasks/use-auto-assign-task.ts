'use client';

import { useAtomValue } from 'jotai';
import { timerStatusState, userState } from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useFirstLoad, useSyncRef } from '../common';
import { useTeamTasks } from '../organizations';
import { TTask } from '@/core/types/schemas/task/task.schema';

/**
 * Auto assign task to auth user when start tracking time
 */
export function useAutoAssignTask() {
	const { firstLoad, firstLoadData } = useFirstLoad();

	const timerStatus = useAtomValue(timerStatusState);
	const authUser = useAtomValue(userState);

	const { updateTask, updateLoading, activeTeamTask } = useTeamTasks();

	const updateLoadingRef = useSyncRef(updateLoading);

	/**
	 * Assign task to the member
	 */
	const autoAssignTask = useCallback(
		(task: TTask, employeeId: string) => {
			const exists = task.members?.some((t) => t.id === employeeId);

			if (exists || updateLoadingRef.current) return;

			return updateTask({
				...task,
				members: [...(task.members || []), (employeeId ? { id: employeeId } : {}) as any]
			});
		},
		[updateTask, updateLoadingRef]
	);

	useEffect(() => {
		if (firstLoad && timerStatus?.running && activeTeamTask && authUser) {
			autoAssignTask(activeTeamTask, authUser.employee?.id || '');
		}
	}, [autoAssignTask, activeTeamTask, timerStatus, authUser, firstLoad]);

	return {
		firstLoadData
	};
}
