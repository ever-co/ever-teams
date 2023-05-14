import { IUser } from '@app/interfaces';
import { tasksByTeamState, tasksStatisticsState } from '@app/stores';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useOrganizationTeams } from './useOrganizationTeams';

export function useAuthTeamTasks(user: IUser | undefined) {
	const tasks = useRecoilValue(tasksByTeamState);
	const statTasks = useRecoilValue(tasksStatisticsState);

	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members.find(
		(member) => member.employee.userId === user?.id
	);

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

	const totalWorkedTasks =
		currentMember?.totalWorkedTasks && currentMember?.totalWorkedTasks.length
			? currentMember?.totalWorkedTasks.map((task) => task.id)
			: [];
	const workedTasks = useMemo(() => {
		return tasks.filter((tsk) => {
			return totalWorkedTasks.includes(tsk.id);
		});
	}, [statTasks, tasks]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks,
	};
}
