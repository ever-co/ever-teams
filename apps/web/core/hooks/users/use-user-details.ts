'use client';

import { ITeamTask } from '@/core/types/interfaces/to-review';
import { useCallback } from 'react';
import { useAuthTeamTasks } from '../organizations/teams/use-auth-team-tasks';
import { useOrganizationTeams, useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useGetTasksStatsData } from '../tasks';

export function useUserDetails(memberId: string) {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, updateTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();

	const members = activeTeam?.members || [];

	const matchUser = members.find((m) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	const activeUserTeamTask = isAuthUser ? activeTeamTask : matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee.user;

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	const loadTaskStatsIObserverRef = useGetTasksStatsData(employeeId);

	const assignTask = useCallback(
		(task: ITeamTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve();
			}

			return updateTask({
				...task,
				members: [...task.members, (matchUser?.employeeId ? { id: matchUser?.employeeId } : {}) as any]
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

// export type I_UserProfilePage = ReturnType<typeof useUserDetails>;
