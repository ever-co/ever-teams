'use client';

import { useCallback } from 'react';
import { useAuthTeamTasks, useOrganizationTeams, useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useGetTasksStatsData } from '../tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';

export function useUserSelectedPage(id?: string) {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, updateTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();

	const memberId: string = id || '';

	const members = activeTeam?.members || [];

	const matchUser = members.find((m: any) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	const activeUserTeamTask = isAuthUser ? activeTeamTask : matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee?.user;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	const loadTaskStatsIObserverRef = useGetTasksStatsData(employeeId);

	const assignTask = useCallback(
		(task: TTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve();
			}

			return updateTask({
				...task,
				members: [...(task.members || []), (matchUser?.employeeId ? { id: matchUser?.employeeId } : {}) as any]
			});
		},
		[updateTask, matchUser]
	);

	return {
		isAuthUser,
		activeUserTeamTask,
		userProfile,
		tasksGrouped,
		member: matchUser,
		assignTask,
		loadTaskStatsIObserverRef
	};
}

// export type I_UserProfilePage = ReturnType<typeof useUserSelectedPage>;
