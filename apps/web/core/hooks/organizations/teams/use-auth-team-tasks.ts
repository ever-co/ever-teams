import { useDailyPlan } from '@/core/hooks';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { estimatedTotalTime, getTotalTasks } from '@/core/components/tasks/daily-plan';
import { TUser } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export function useAuthTeamTasks(user: TUser | undefined) {
	const tasks = useAtomValue(tasksByTeamState);
	const { data: authenticatedUser } = useUserQuery();

	const activeTeam = useAtomValue(activeTeamState);
	// Use provided user or fallback to authenticated user
	const targetUser = user || authenticatedUser;
	const currentMember = activeTeam?.members?.find((member) => member.employee?.userId === targetUser?.id);
	const employeeId = targetUser?.employee?.id ?? targetUser?.employeeId ?? '';
	const { futurePlans, todayPlan, outstandingPlans } = useDailyPlan(employeeId);

	const assignedTasks = useMemo(() => {
		if (!targetUser) return [];
		return tasks.filter((task: TTask) => {
			return task?.members?.some((m) => m.userId === targetUser.id);
		});
	}, [tasks, targetUser]);

	const unassignedTasks = useMemo(() => {
		if (!targetUser) return [];
		return tasks.filter((task: TTask) => {
			return !task?.members?.some((m) => m.userId === targetUser.id);
		});
	}, [tasks, targetUser]);

	const planned = useMemo(() => {
		// Helper function to filter tasks by user
		const filterTasksByUser = (tasks: TTask[]) => {
			if (!targetUser) return tasks;
			return tasks.filter((task) => task.members?.some((member) => member.userId === targetUser.id));
		};

		// Filter outstanding plans tasks by user before calculating
		const filteredOutstandingTasks = outstandingPlans?.map((plan) => filterTasksByUser(plan.tasks || [])) || [];
		const outStandingTasksCount = estimatedTotalTime(filteredOutstandingTasks).totalTasks;

		// Pass targetUser to getTotalTasks for proper filtering
		const todayTasksCount = getTotalTasks(todayPlan, targetUser);
		const futureTasksCount = getTotalTasks(futurePlans, targetUser);

		return outStandingTasksCount + futureTasksCount + todayTasksCount;
	}, [futurePlans, outstandingPlans, todayPlan, targetUser]);

	const totalTodayTasks = useMemo(
		() =>
			currentMember?.totalTodayTasks && currentMember?.totalTodayTasks.length
				? currentMember?.totalTodayTasks.map((task: TTask) => task.id)
				: [],
		[currentMember]
	);

	const workedTasks = useMemo(() => {
		return tasks.filter((tsk: TTask) => {
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
