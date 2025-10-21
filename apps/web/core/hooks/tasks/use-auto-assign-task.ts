'use client';

import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useFirstLoad, useSyncRef } from '../common';
import { useTeamTasks } from '../organizations';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Auto assign task to auth user when start tracking time
 */
export function useAutoAssignTask() {
	const { firstLoad, firstLoadData } = useFirstLoad();
	const activeTeam = useAtomValue(activeTeamState);

	const timerStatus = useAtomValue(timerStatusState);
	const { data: authUser } = useUserQuery();
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const { updateTask, updateLoading } = useTeamTasks();

	const updateLoadingRef = useSyncRef(updateLoading);

	/**
	 * Assign task to the member
	 */
	const autoAssignTask = useCallback(
		(task: TTask, employeeId: string) => {
			const exists = task.members?.some((t) => t.id === employeeId);
			const newMember = activeTeam?.members?.find((m) => m.employeeId === employeeId);

			if (exists || updateLoadingRef.current) return;

			return updateTask({
				...task,
				members: [...(task.members || []), newMember ? newMember.employee : {}]
			});
		},
		[updateTask, updateLoadingRef, activeTeam]
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
