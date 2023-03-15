import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useAuthTeamTasks } from './useAuthTeamTasks';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskStatistics } from './useTaskStatistics';
import { useTeamTasks } from './useTeamTasks';

export function useUserProfilePage() {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();
	const { getAllTasksStatsData } = useTaskStatistics();

	const router = useRouter();
	const { memberId } = router.query;

	const members = activeTeam?.members || [];

	const matchUser = members.find((m) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee.userId === memberId;

	const activeUserTeamTask = isAuthUser
		? activeTeamTask
		: matchUser?.lastWorkedTask;

	const userProfile = isAuthUser ? auth : matchUser?.employee.user;

	const employeeId = isAuthUser ? auth?.employee.id : matchUser?.employeeId;

	/* Filtering the tasks */
	const tasksGrouped = useAuthTeamTasks(userProfile);

	useEffect(() => {
		if (employeeId) {
			getAllTasksStatsData(employeeId);
		}
	}, [getAllTasksStatsData, employeeId]);

	return {
		isAuthUser,
		activeUserTeamTask,
		userProfile,
		tasksGrouped,
	};
}

export type I_UserProfilePage = ReturnType<typeof useUserProfilePage>;
