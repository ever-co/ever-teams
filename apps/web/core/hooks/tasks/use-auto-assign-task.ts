'use client';

import { timerStatusState } from '@/core/stores';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useAtomValue } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useFirstLoad } from '../common';
import { useCurrentActiveTask } from '../organizations/teams/use-current-active-task';
import { useCurrentTeam } from '../organizations/teams/use-current-team';
import { useUpdateTaskMutation } from '../organizations/teams/use-update-task.mutation';
import { useUserQuery } from '../queries/user-user.query';
import { useSetActiveTask } from '../organizations/teams/use-set-active-task';

/**
 * Auto assign task to auth user when start tracking time
 */
export function useAutoAssignTask() {
	const { firstLoad, firstLoadData } = useFirstLoad();
	const activeTeam = useCurrentTeam();

	const timerStatus = useAtomValue(timerStatusState);
	const { data: authUser } = useUserQuery();
	const { task: activeTeamTask } = useCurrentActiveTask();

	const { mutateAsync: updateTask, isPending: updateLoading } = useUpdateTaskMutation();
	const { setActiveTask } = useSetActiveTask();

	/**
	 * Assign task to the member
	 */
	const autoAssignTask = useCallback(
		(task: TTask, employeeId: string) => {
			const exists = task.members?.some((t) => t.id === employeeId);
			const newMember = activeTeam?.members?.find((m) => m.employeeId === employeeId);

			if (exists || updateLoading) return;

			return updateTask({
				taskId: task?.id,
				taskData: { ...task, members: [...(task.members || []), newMember ? newMember.employee : {}] }
			}).then((task) => setActiveTask(task));
		},
		[updateTask, updateLoading, activeTeam]
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
