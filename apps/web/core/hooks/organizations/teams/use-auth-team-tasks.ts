import { tasksByTeamState } from '@/core/stores';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useOrganizationTeams } from './use-organization-teams';
import { useDailyPlan } from '../../daily-plans/use-daily-plan';
import { estimatedTotalTime, getTotalTasks } from '@/core/components/tasks/daily-plan';
import { ITask } from '@/core/types/interfaces/task/task';
import { TUser } from '@/core/types/schemas';

export function useAuthTeamTasks(user: TUser | undefined) {
	const tasks = useAtomValue(tasksByTeamState);
	const { outstandingPlans, todayPlan, futurePlans } = useDailyPlan();

	const { activeTeam } = useOrganizationTeams();
	const currentMember = activeTeam?.members?.find((member) => member.employee?.userId === user?.id);

	const assignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task: ITask) => {
			return task?.members?.some((m) => m.userId === user.id);
		});
	}, [tasks, user]);

	const unassignedTasks = useMemo(() => {
		if (!user) return [];
		return tasks.filter((task: ITask) => {
			return !task?.members?.some((m) => m.userId === user.id);
		});
	}, [tasks, user]);

	const planned = useMemo(() => {
		const outStandingTasksCount = estimatedTotalTime(
			outstandingPlans?.map((plan) => plan.tasks?.map((task: ITask) => task))
		).totalTasks;

		const todayTasksCOunt = getTotalTasks(todayPlan);

		const futureTasksCount = getTotalTasks(futurePlans);

		return outStandingTasksCount + futureTasksCount + todayTasksCOunt;
	}, [futurePlans, outstandingPlans, todayPlan]);

	const totalTodayTasks = useMemo(
		() =>
			currentMember?.totalTodayTasks && currentMember?.totalTodayTasks.length
				? currentMember?.totalTodayTasks.map((task: ITask) => task.id)
				: [],
		[currentMember]
	);

	const workedTasks = useMemo(() => {
		return tasks.filter((tsk: ITask) => {
			return totalTodayTasks.includes(tsk.id);
		});
	}, [tasks, totalTodayTasks]);

	return {
		assignedTasks,
		unassignedTasks,
		workedTasks,
		planned,
		tasks
	};
}
