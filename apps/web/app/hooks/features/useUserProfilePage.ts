import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTaskStatistics } from './useTaskStatistics';
import { useTeamTasks } from './useTeamTasks';

export function useUserProfilePage() {
	const { activeTeam } = useOrganizationTeams();
	const { activeTeamTask, tasks } = useTeamTasks();

	const { user: auth } = useAuthenticateUser();
	const { getAllTasksStatsData } = useTaskStatistics();

	const router = useRouter();
	const { memberId } = router.query;

	const members = activeTeam?.members || [];

	const matchUser = members.find((m) => {
		return m.employee.userId === memberId;
	});

	const isAuthUser = auth?.employee.userId === memberId;
	const activeUserTeamTask = isAuthUser ? activeTeamTask : null;

	const userProfile =
		auth?.employee.userId === memberId ? auth : matchUser?.employee.user;

	const otherTasks = activeUserTeamTask
		? tasks.filter((t) => t.id !== activeUserTeamTask.id)
		: tasks;

	useEffect(() => {
		getAllTasksStatsData();
	}, [getAllTasksStatsData]);

	return {
		isAuthUser,
		tasks,
		otherTasks,
		activeUserTeamTask,
		userProfile,
	};
}

export type I_UserProfilePage = ReturnType<typeof useUserProfilePage>;
