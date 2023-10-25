import { ITeamTask } from '@app/interfaces';
import { useRouter } from 'next/router';
import { useCallback, useEffect } from 'react';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useAuthTeamTasks } from './useAuthTeamTasks';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskStatistics } from './useTaskStatistics';
import { useTeamTasks } from './useTeamTasks';

export function useUserProfilePage() {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, updateTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();
	const { getTasksStatsData } = useTaskStatistics();

	const router = useRouter();
	const { memberId } = router.query;

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

	useEffect(() => {
		if (employeeId) {
			getTasksStatsData(employeeId);
		}
	}, [getTasksStatsData, employeeId]);

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
		assignTask
	};
}

export type I_UserProfilePage = ReturnType<typeof useUserProfilePage>;
