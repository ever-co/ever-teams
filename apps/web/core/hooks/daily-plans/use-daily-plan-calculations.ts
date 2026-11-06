'use client';

import { useMemo } from 'react';
import moment from 'moment';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { isTaskFinished } from '@/core/lib/helpers/task';

/** Id of the outstanding view's placeholder plan for unplanned tasks: it does not exist on the API. */
export const OUTSTANDING_NO_PLAN_ID = 'outstanding-no-plan';

interface PlanListsOfDay {
	dayKey: string;
	ascSortedPlans: TDailyPlan[];
	descSortedPlans: TDailyPlan[];
	futurePlans: TDailyPlan[];
	pastPlans: TDailyPlan[];
	todayPlan: TDailyPlan[];
	todayTasks: TTask[];
	futureTasks: TTask[];
	pastPlansWithIncompleteTasks: TDailyPlan[];
	allPlannedTaskIds: Set<string>;
	sortedPlans: TDailyPlan[];
}

/**
 * Every hook instance reading the same plans response gets the same lists. Keyed by the response object, so an
 * entry goes away with the response; the day is kept beside it because the lists split the plans around today.
 */
const planListsCache = new WeakMap<PaginationResponse<TDailyPlan>, PlanListsOfDay>();

function byDateAscending(first: TDailyPlan, second: TDailyPlan) {
	return new Date(first.date).getTime() - new Date(second.date).getTime();
}

function byDateDescending(first: TDailyPlan, second: TDailyPlan) {
	return new Date(second.date).getTime() - new Date(first.date).getTime();
}

function isUnfinished(task: TTask) {
	return !isTaskFinished(task.status);
}

function pastPlansWithIncompleteTasksOf(plans: TDailyPlan[], dayKey: string, usedIds: Set<string>) {
	const isNotPlannedAgain = (task: TTask) => !usedIds.has(task.id);
	return plans
		.filter((plan) => getDailyPlanDay(plan.date) < dayKey)
		.sort(byDateAscending)
		.map((plan) => ({ ...plan, tasks: plan.tasks?.filter(isUnfinished) }))
		.map((plan) => ({ ...plan, tasks: plan.tasks?.filter(isNotPlannedAgain) }))
		.filter((plan) => plan.tasks?.length && plan.tasks.length > 0);
}

function computePlanLists(dailyPlans: PaginationResponse<TDailyPlan> | undefined, dayKey: string): PlanListsOfDay {
	const items = dailyPlans?.items ?? [];
	const ascSortedPlans = [...items].sort(byDateAscending);
	const descSortedPlans = [...items].sort(byDateDescending);
	const futurePlans = ascSortedPlans.filter((plan) => getDailyPlanDay(plan.date) > dayKey);
	const pastPlans = descSortedPlans.filter((plan) => getDailyPlanDay(plan.date) < dayKey);
	const todayPlan = items.filter((plan) => {
		if (!plan.date) {
			return false;
		}
		return getDailyPlanDay(plan.date) === dayKey;
	});
	const todayTasks = todayPlan.flatMap((plan) => plan.tasks ?? []);
	const futureTasks = futurePlans.flatMap((plan) => plan.tasks ?? []);
	const usedIds = new Set<string>([...todayTasks, ...futureTasks].map((task) => task.id));
	const pastPlansWithIncompleteTasks = pastPlansWithIncompleteTasksOf([...items], dayKey, usedIds);
	const allPlannedTaskIds = new Set<string>(items.flatMap((plan) => plan.tasks?.map((task) => task.id) ?? []));
	const sortedPlans = [...ascSortedPlans];

	return {
		dayKey,
		ascSortedPlans,
		descSortedPlans,
		futurePlans,
		pastPlans,
		todayPlan,
		todayTasks,
		futureTasks,
		pastPlansWithIncompleteTasks,
		allPlannedTaskIds,
		sortedPlans
	};
}

function planListsOf(dailyPlans: PaginationResponse<TDailyPlan> | undefined): PlanListsOfDay {
	const dayKey = moment().format('YYYY-MM-DD');
	if (!dailyPlans) {
		return computePlanLists(dailyPlans, dayKey);
	}
	const cached = planListsCache.get(dailyPlans);
	const isCachedForToday = cached?.dayKey === dayKey;
	if (cached && isCachedForToday) {
		return cached;
	}
	const lists = computePlanLists(dailyPlans, dayKey);
	planListsCache.set(dailyPlans, lists);
	return lists;
}

function hasTimeOrEstimate(task: TTask) {
	const hasWorkedTime = Boolean(task.totalWorkedTime && task.totalWorkedTime > 0);
	const hasEstimate = Boolean(task.estimate && task.estimate > 0);
	return hasWorkedTime || hasEstimate;
}

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
	const planLists = useMemo(() => planListsOf(dailyPlans), [dailyPlans]);

	// Past incomplete tasks, plus a virtual plan of the member's unplanned tasks that carry time or an estimate
	const outstandingPlans = useMemo(() => {
		const tasksNotInAnyPlan = allTeamTasks.filter((task) => {
			const isAssignedToTargetEmployee =
				!!targetEmployeeId && task.members?.some((member) => member.id === targetEmployeeId);
			const isNotInAnyPlan = !planLists.allPlannedTaskIds.has(task.id);
			const isOpenWork = hasTimeOrEstimate(task) && isUnfinished(task);
			const isUnplannedWork = isNotInAnyPlan && isOpenWork;
			return isAssignedToTargetEmployee && isUnplannedWork;
		});

		if (tasksNotInAnyPlan.length === 0) {
			return [...planLists.pastPlansWithIncompleteTasks];
		}

		const virtualPlanForUnplannedTasks: TDailyPlan = {
			id: OUTSTANDING_NO_PLAN_ID,
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
		};
		return [...planLists.pastPlansWithIncompleteTasks, virtualPlanForUnplannedTasks];
	}, [planLists, allTeamTasks, activeTeam, targetEmployeeId]);

	return {
		futurePlans: planLists.futurePlans,
		pastPlans: planLists.pastPlans,
		todayPlan: planLists.todayPlan,
		todayTasks: planLists.todayTasks,
		futureTasks: planLists.futureTasks,
		outstandingPlans,
		sortedPlans: planLists.sortedPlans,
		ascSortedPlans: planLists.ascSortedPlans,
		descSortedPlans: planLists.descSortedPlans
	};
}
