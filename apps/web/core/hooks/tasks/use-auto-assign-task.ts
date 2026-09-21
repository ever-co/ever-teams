'use client';

import { useAtomValue } from 'jotai';
import { activeTeamState, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useFirstLoad, useSyncRef } from '../common';
import { useUpdateTask } from '../organizations';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Auto assign task to auth user when start tracking time
 */
export function useAutoAssignTask(options: { enabled?: boolean } = {}) {
	const { enabled = true } = options;
	const explicitlyControlled = options.enabled !== undefined;
	const { firstLoad, firstLoadData } = useFirstLoad();
	const activeTeam = useAtomValue(activeTeamState);

	const timerStatus = useAtomValue(timerStatusState);
	const { data: authUser } = useUserQuery();
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const { updateTask, updateLoading } = useUpdateTask();

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
		if (enabled && (firstLoad || explicitlyControlled) && timerStatus?.running && activeTeamTask && authUser) {
			autoAssignTask(activeTeamTask, authUser.employee?.id || '');
		}
	}, [autoAssignTask, activeTeamTask, timerStatus, authUser, firstLoad, enabled, explicitlyControlled]);

	return {
		firstLoadData
	};
}
