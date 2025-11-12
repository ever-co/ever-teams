import { useDailyPlan } from '@/core/hooks';
import { activeTeamState, tasksByTeamState } from '@/core/stores';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { getTotalTasks } from '@/core/components/tasks/daily-plan';
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
	const employeeId = targetUser?.employee?.id ?? targetUser?.employeeId ?? currentMember?.employee?.id ?? '';
	const { futurePlans, todayPlan } = useDailyPlan(employeeId);

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
		// Return stable 0 until we know whose plans to show
		if (!targetUser || !employeeId) return 0;

		// Pass targetUser to getTotalTasks for proper filtering
		const todayTasksCount = getTotalTasks(todayPlan, targetUser);
		const futureTasksCount = getTotalTasks(futurePlans, targetUser);

		// NOTE_FIX: "planned" should only include tasks in daily plans (today + future)
		// Outstanding tasks are NOT planned by definition - they are tasks without plans
		// or tasks in past plans that are incomplete
		return todayTasksCount + futureTasksCount;
	}, [futurePlans, todayPlan, targetUser, employeeId]);

	const totalTodayTasks = useMemo(
		() =>
			currentMember?.totalTodayTasks?.length ? currentMember?.totalTodayTasks.map((task: TTask) => task.id) : [],
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
