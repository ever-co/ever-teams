'use client';

import { useCallback } from 'react';
import { useAuthTeamTasks } from '../organizations/teams/use-auth-team-tasks';
import { useTeamTasks } from '../organizations';
import { useAuthenticateUser } from '../auth';
import { useGetTasksStatsData } from '../tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';

export function useUserDetails(memberId: string) {
	const activeTeam = useAtomValue(activeTeamState);
	const { activeTeamTask, updateTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();

	const members = activeTeam?.members || [];

	const matchUser = members.find((m: any) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee?.userId === memberId;

	const activeUserTeamTask = isAuthUser ? activeTeamTask : matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee?.user;

	const employeeId = isAuthUser ? auth?.employee?.id : matchUser?.employeeId;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	const loadTaskStatsIObserverRef = useGetTasksStatsData(employeeId);

	const assignTask = useCallback(
		(task: TTask) => {
			if (!matchUser?.employeeId) {
				return Promise.resolve();
			}

			return updateTask({
				...task,
				members: [...(task.members || []), matchUser ? matchUser.employee : {}]
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
