import { useMemo } from 'react';
import { useStores } from '../../../models';
import { IUser } from '../../interfaces/interfaces/IUserData';
import { useTeamTasks } from './useTeamTasks';

export function useAuthTeamTasks(user: IUser | undefined) {
	const {
		TaskStore: { teamTasks, tasksStatisticsState }
	} = useStores();
	const { isRefetching } = useTeamTasks();

	const statTasks = tasksStatisticsState;

	const assignedTasks = useMemo(() => {
		if (!user) return [];
		return teamTasks?.filter((task) => {
			return task?.members.some((m) => m.userId === user.id);
		});
	}, [teamTasks, user, isRefetching]);

	const unassignedTasks = useMemo(() => {
		if (!user) return [];
		return teamTasks?.filter((task) => {
			return !task?.members.some((m) => m.userId === user.id);
		});
	}, [teamTasks, user, isRefetching]);

	const workedTasks = useMemo(() => {
		return teamTasks?.filter((tsk) => {
			return statTasks?.today.some((st) => st.id === tsk.id);
		});
	}, [statTasks, teamTasks, isRefetching]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks
	};
}
