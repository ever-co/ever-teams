import { useMemo } from 'react';
import { IUseDailyPlanOptions } from '../queries';
import { useProfileDailyPlans } from './use-profile-daily-plans';
import { useFutureTasks, useTodayTasks } from './use-plan-tasks';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useSortedTasksByCreation } from '../../organizations/teams/use-sorted-tasks';
import { useCurrentTeam } from '../../organizations/teams/use-current-team';
import { TDailyPlan } from '@/core/types/schemas';

/** ID for the virtual plan containing unplanned tasks (client-side only) */
const VIRTUAL_UNPLANNED_TASKS_ID = 'outstanding-no-plan';

/**
 * Returns "outstanding" plans requiring attention:
 * 1. Past plans with incomplete tasks not yet rescheduled
 * 2. Unplanned tasks with time tracked or estimates (as a virtual plan)
 *
 * Replaces legacy `outstandingPlansState` atom.
 *
 * @param employeeId - Employee ID to filter plans (required for accurate unplanned tasks detection)
 * @param options - Query options ({ enabled })
 */
export const useOutstandingPlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const activeTeam = useCurrentTeam();
	const profileDailyPlans = useProfileDailyPlans(employeeId, { enabled });
	const todayTasks = useTodayTasks();
	const futureTasks = useFutureTasks();
	const allTeamTasks = useSortedTasksByCreation();

	// NOTE: Replacement for futureTasksState atom; keeps future task list
	// local to this hook instead of global Jotai.
	// NOTE: Replacement for outstandingPlansState atom; keeps "outstanding"
	// logic close to daily-plan queries instead of global Jotai stores.
	const outstandingPlans = useMemo(() => {
		// Build a Set of task IDs from today/future to avoid repeated linear searches (O(1) lookup instead of O(n²))
		const usedIds = new Set<string>([...todayTasks, ...futureTasks].map((t: TTask) => t.id));

		// PART 1: Past plans with incomplete tasks not in today/future
		const pastPlansWithIncompleteTasks = [...(profileDailyPlans.items ? profileDailyPlans.items : [])]
			// Exclude today plans
			.filter((plan) => !plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]))
			// Exclude future plans (keep only past plans)
			.filter((plan) => {
				const planDate = new Date(plan.date);
				const today = new Date();
				today.setHours(23, 59, 59, 0);
				return planDate.getTime() <= today.getTime();
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.map((plan) => ({
				...plan,
				// Include only non-completed tasks
				tasks: plan.tasks?.filter((task) => task.status !== 'completed')
			}))
			.map((plan) => ({
				...plan,
				// Include only tasks not added yet to today/future plans
				tasks: plan.tasks?.filter((_task) => !usedIds.has(_task.id))
			}))
			.filter((plan) => plan.tasks?.length && plan.tasks.length > 0);

		// PART 2: Tasks assigned to member that are NOT in ANY plan
		// Build a Set of ALL task IDs that are in ANY plan (today, future, past)
		const allPlannedTaskIds = new Set<string>(
			profileDailyPlans.items?.flatMap((plan) => plan.tasks?.map((t) => t.id) ?? []) ?? []
		);

		// Filter tasks assigned to the target employee that are NOT in any plan
		const tasksNotInAnyPlan = allTeamTasks.filter((task) => {
			// Must be assigned to the target employee (match by employeeId, not current user)
			const isAssignedToTargetEmployee = !!employeeId && task.members?.some((member) => member.id === employeeId);
			// Must NOT be in any plan
			const isNotInAnyPlan = !allPlannedTaskIds.has(task.id);
			// Must have time tracked OR estimation set
			const hasTimeOrEstimate =
				(task.totalWorkedTime && task.totalWorkedTime > 0) || (task.estimate && task.estimate > 0);

			return isAssignedToTargetEmployee && isNotInAnyPlan && hasTimeOrEstimate;
		});

		// Create a virtual plan for tasks not in any plan (if any exist)
		const virtualPlanForUnplannedTasks: TDailyPlan[] =
			tasksNotInAnyPlan.length > 0
				? [
						{
							id: VIRTUAL_UNPLANNED_TASKS_ID,
							date: new Date().toISOString(),
							tasks: tasksNotInAnyPlan,
							workTimePlanned: 0,
							status: 'open',
							tenantId: activeTeam?.tenantId ?? null,
							organizationId: activeTeam?.organizationId ?? null,
							employeeId: employeeId ?? null,
							employee: null,
							organizationTeamId: activeTeam?.id ?? null,
							organizationTeam: null
						}
					]
				: [];

		// Combine past plans with incomplete tasks + virtual plan for unplanned tasks
		return [...pastPlansWithIncompleteTasks, ...virtualPlanForUnplannedTasks];
	}, [profileDailyPlans, todayTasks, futureTasks, allTeamTasks, activeTeam, employeeId]);

	return outstandingPlans;
};
