import { IUser } from '@app/interfaces';
import { tasksByTeamState, tasksStatisticsState } from '@app/stores';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';

export function useAuthTeamTasks(user: IUser | undefined) {
	const tasks = useRecoilValue(tasksByTeamState);
	const statTasks = useRecoilValue(tasksStatisticsState);

	const assignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task) => {
			return task?.members.some((m) => m.userId === user.id);
		});
	}, [tasks, user]);

	const unassignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task) => {
			return !task?.members.some((m) => m.userId === user.id);
		});
	}, [tasks, user]);

	const workedTasks = useMemo(() => {
		return tasks.filter((tsk) => {
			return statTasks.today.some((st) => st.id === tsk.id);
		});
	}, [statTasks, tasks]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks,
	};
}
