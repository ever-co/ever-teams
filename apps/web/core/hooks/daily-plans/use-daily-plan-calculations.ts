'use client';

import { useMemo } from 'react';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';

/**
 * Shared calculations for daily plan derived state.
 * Used by useMyDailyPlans, useEmployeeDailyPlans, and useTeamDailyPlans
 * to ensure consistent logic across all hooks.
 *
 * @param dailyPlans - The daily plans data to calculate from
 * @param allTeamTasks - All tasks in the team (for outstanding plans calculation)
 * @param targetEmployeeId - Optional employee ID for filtering (used in outstanding plans)
 * @param activeTeam - Active team data (for outstanding plans virtual plan)
 */
export function useDailyPlanCalculations(
	dailyPlans: PaginationResponse<TDailyPlan> | undefined,
	allTeamTasks: TTask[],
	targetEmployeeId?: string | null,
	activeTeam?: { id: string; tenantId?: string | null; organizationId?: string | null } | null
) {
	// Sorted plans (ascending by date)
	const ascSortedPlans = useMemo(() => {
		return [...(dailyPlans?.items ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [dailyPlans]);

	// Sorted plans (descending by date)
	const descSortedPlans = useMemo(() => {
		return [...(dailyPlans?.items ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}, [dailyPlans]);

	// Future plans (dates after today)
	const futurePlans = useMemo(() => {
		return ascSortedPlans.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparison
			// NOTE_FIX: Use > instead of >= to exclude today's plans from future plans
			// Future plans should only include dates AFTER today, not today itself
			return planDate.getTime() > today.getTime();
		});
	}, [ascSortedPlans]);

	// Past plans (dates before today)
	const pastPlans = useMemo(() => {
		return descSortedPlans.filter((plan) => {
			const planDate = new Date(plan.date);
			const today = new Date();
			today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparison
			return planDate.getTime() < today.getTime();
		});
	}, [descSortedPlans]);

	// Today's plan (plans for current date)
	const todayPlan = useMemo(() => {
		return [...(dailyPlans?.items ?? [])].filter((plan) =>
			plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
		);
	}, [dailyPlans]);

	// Today's tasks (all tasks from today's plan)
	const todayTasks = useMemo(() => {
		return todayPlan.flatMap((plan) => plan.tasks ?? []);
	}, [todayPlan]);

	// Future tasks (all tasks from future plans)
	const futureTasks = useMemo(() => {
		return futurePlans.flatMap((plan) => plan.tasks ?? []);
	}, [futurePlans]);

	// Outstanding plans (past incomplete tasks + unplanned tasks)
	// OPTIMIZATION: Use Set for O(1) lookups instead of O(n²) array operations
	const outstandingPlans = useMemo(() => {
		// Build a Set of task IDs from today/future to avoid repeated linear searches (O(1) lookup instead of O(n²))
		const usedIds = new Set<string>([...todayTasks, ...futureTasks].map((t: TTask) => t.id));

		// PART 1: Past plans with incomplete tasks not in today/future
		const pastPlansWithIncompleteTasks = [...(dailyPlans?.items ?? [])]
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
				tasks: plan.tasks?.filter((task: TTask) => task.status !== 'completed')
			}))
			.map((plan) => ({
				...plan,
				// Include only tasks not added yet to today/future plans
				tasks: plan.tasks?.filter((_task: TTask) => !usedIds.has(_task.id))
			}))
			.filter((plan) => plan.tasks?.length && plan.tasks.length > 0);

		// PART 2: Tasks assigned to member that are NOT in ANY plan
		// Build a Set of ALL task IDs that are in ANY plan (today, future, past)
		const allPlannedTaskIds = new Set<string>(
			dailyPlans?.items?.flatMap((plan) => plan.tasks?.map((t: TTask) => t.id) ?? []) ?? []
		);

		// Filter tasks assigned to the target employee that are NOT in any plan
		const tasksNotInAnyPlan = allTeamTasks.filter((task) => {
			// Must be assigned to the target employee (match by employeeId, not current user)
			const isAssignedToTargetEmployee =
				!!targetEmployeeId && task.members?.some((member) => member.id === targetEmployeeId);
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
							id: 'outstanding-no-plan',
							date: new Date().toISOString(),
							tasks: tasksNotInAnyPlan,
							workTimePlanned: 0,
							status: 'open',
							tenantId: activeTeam?.tenantId ?? null,
							organizationId: activeTeam?.organizationId ?? null,
							employeeId: targetEmployeeId ?? null,
							employee: null,
							organizationTeamId: activeTeam?.id ?? null,
							organizationTeam: null
						}
					]
				: [];

		// Combine past plans with incomplete tasks + virtual plan for unplanned tasks
		return [...pastPlansWithIncompleteTasks, ...virtualPlanForUnplannedTasks];
	}, [dailyPlans, todayTasks, futureTasks, allTeamTasks, activeTeam, targetEmployeeId]);

	// Generic sorted plans (used by various views)
	const sortedPlans = useMemo(() => {
		return [...(dailyPlans?.items ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [dailyPlans]);

	return {
		futurePlans,
		pastPlans,
		todayPlan,
		todayTasks,
		futureTasks,
		outstandingPlans,
		sortedPlans,
		ascSortedPlans,
		descSortedPlans
	};
}
