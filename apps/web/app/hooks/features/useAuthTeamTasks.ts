import { IUser } from '@app/interfaces/IUserData';
import { tasksByTeamState } from '@app/stores';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';

export function useAuthTeamTasks(user: IUser | undefined) {
	const tasks = useRecoilValue(tasksByTeamState);

	const assignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task) => {
			return task.members.some((m) => m.id === user.id);
		});
	}, [tasks, user]);

	const unassignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task) => {
			return !task.members.some((m) => m.id === user.id);
		});
	}, [tasks, user]);

	return {
		assignedTasks,
		unassignedTasks,
	};
}
