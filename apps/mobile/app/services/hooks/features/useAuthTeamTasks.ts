import { useMemo } from 'react';
import { useStores } from '../../../models';
import { IUser } from '../../interfaces/interfaces/IUserData';
import { useTeamTasks } from './useTeamTasks';
import { useOrganizationTeam } from '../useOrganization';

export function useAuthTeamTasks(user: IUser | undefined) {
	const {
		TaskStore: { teamTasks, tasksStatisticsState }
	} = useStores();
	const { isRefetching } = useTeamTasks();

	const { currentTeam } = useOrganizationTeam();
	const currentMember = currentTeam?.members?.find((member) => member.employee?.userId === user?.id);

	const statTasks = tasksStatisticsState;

	const assignedTasks = useMemo(() => {
		if (!user) return [];
		return teamTasks?.filter((task) => {
			return task?.members.some((m) => m?.userId === user?.id);
		});
	}, [teamTasks, user, isRefetching]);

	const unassignedTasks = useMemo(() => {
		if (!user) return [];
		return teamTasks?.filter((task) => {
			return !task?.members.some((m) => m?.userId === user?.id);
		});
	}, [teamTasks, user, isRefetching]);

	const totalTodayTasks = useMemo(() => {
		return currentMember?.totalTodayTasks && currentMember?.totalTodayTasks.length
			? currentMember?.totalTodayTasks.map((task) => task?.id)
			: [];
	}, [currentMember]);

	const workedTasks = useMemo(() => {
		return teamTasks?.filter((tsk) => {
			return totalTodayTasks?.includes(tsk?.id);
		});
	}, [statTasks, teamTasks, isRefetching]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks
	};
}
