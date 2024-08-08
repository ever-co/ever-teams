import { IUser } from '@app/interfaces';
import { tasksByTeamState } from '@app/stores';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useDailyPlan } from './useDailyPlan';
import { estimatedTotalTime, getTotalTasks } from 'lib/features/task/daily-plan';

export function useAuthTeamTasks(user: IUser | undefined) {
	const tasks = useRecoilValue(tasksByTeamState);
	const { outstandingPlans, todayPlan, futurePlans } = useDailyPlan();

	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members?.find((member) => member.employee?.userId === user?.id);

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

	const planned = useMemo(() => {
		const outStandingTasksCount = estimatedTotalTime(
			outstandingPlans.map((plan) => plan.tasks?.map((task) => task))
		).totalTasks;

		const todayTasksCOunt = getTotalTasks(todayPlan);

		const futureTasksCount = getTotalTasks(futurePlans);

		return outStandingTasksCount + futureTasksCount + todayTasksCOunt;
	}, [futurePlans, outstandingPlans, todayPlan]);

	const totalTodayTasks = useMemo(
		() =>
			currentMember?.totalTodayTasks && currentMember?.totalTodayTasks.length
				? currentMember?.totalTodayTasks.map((task) => task.id)
				: [],
		[currentMember]
	);

	const workedTasks = useMemo(() => {
		return tasks.filter((tsk) => {
			return totalTodayTasks.includes(tsk.id);
		});
	}, [tasks, totalTodayTasks]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks,
		planned
	};
}
