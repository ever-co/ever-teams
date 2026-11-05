'use client';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, type ReactNode } from 'react';

import { FilterTabs } from '@/core/types/daily-plan-types';
import { I_UserProfilePage } from '@/core/hooks';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { useDailyPlanTaskOrder } from '@/core/hooks/daily-plans/use-daily-plan-task-order';
import {
	filterDailyPlan,
	filterDailyPlansByEmployee,
	filterDailyPlansByTasks
} from '@/core/hooks/daily-plans/use-filter-date-range';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { dailyPlanViewHeaderTabs } from '@/core/stores';
import { PendingPlanDayBlocks } from '@/core/components/features/daily-plan/pending-plan-tasks';
import { PlanDayGroupList } from '@/core/components/tasks/daily-plan/plan-day-groups';
import { keepPickedPlans, planDayKeyOf } from '@/core/components/tasks/daily-plan/plan-picks';
import { TASK_LIST_STACK } from '@/core/components/tasks/task-row-recipes';
import { usePendingPlanDays } from '@/core/hooks/daily-plans/use-pending-plan-additions';
import { todayKey } from '@/core/lib/utils/daily-plan-editor';
import { EmptyPlans } from './empty-plans';

const NO_PLANS: TDailyPlan[] = [];

function showsDayIn(currentTab: FilterTabs, day: string) {
	if (currentTab === 'Today Tasks') {
		return day === todayKey();
	}
	return true;
}

function cardPlanModeFor(currentTab: FilterTabs): FilterTabs | undefined {
	if (currentTab === 'Today Tasks') {
		return 'Today Tasks';
	}
	return undefined;
}

function defaultOpenDays(currentTab: FilterTabs, plans: TDailyPlan[]) {
	if (currentTab === 'Today Tasks') {
		return [todayKey()];
	}
	const firstPlan = plans[0];
	if (!firstPlan) {
		return [];
	}
	return [planDayKeyOf(firstPlan)];
}

function tabPlansOf(currentTab: FilterTabs, todayPlan: TDailyPlan[], sortedPlans: TDailyPlan[]) {
	if (currentTab === 'Today Tasks') {
		return todayPlan;
	}
	return sortedPlans;
}

export function AllPlans({
	profile,
	currentTab = 'All Tasks',
	user,
	employeeId,
	filterByEmployee = false,
	filteredTaskIds,
	pickedPlanIds,
	emptyState
}: Readonly<{
	profile: I_UserProfilePage;
	currentTab?: FilterTabs;
	user?: TUser;
	employeeId?: string; // Accept employeeId directly from parent
	filterByEmployee?: boolean; // Filter tasks by employee (default: false = show all tasks)
	filteredTaskIds?: string[]; // Filter plans by taskIds (default undefined = show all)
	pickedPlanIds?: string[];
	emptyState?: ReactNode;
}>) {
	const targetEmployeeId = employeeId ?? user?.employee?.id ?? user?.employeeId ?? '';
	const { employeeSortedPlans, employeeTodayPlan } = useEmployeeDailyPlans(targetEmployeeId);
	const { date } = useDateRange(currentTab, targetEmployeeId);
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	const plans = useMemo(() => {
		const tabPlans = tabPlansOf(currentTab, employeeTodayPlan, employeeSortedPlans);
		const pickedPlans = keepPickedPlans(tabPlans, pickedPlanIds);
		let filteredData = filterDailyPlan(date, pickedPlans);

		// `user` is the profile user: task members are users, not employees
		if (filterByEmployee && filteredData) {
			filteredData = filterDailyPlansByEmployee(filteredData, user);
		}

		if (filteredTaskIds && filteredData) {
			filteredData = filterDailyPlansByTasks(filteredData, filteredTaskIds);
		}

		return filteredData;
	}, [
		currentTab,
		date,
		employeeTodayPlan,
		employeeSortedPlans,
		user,
		filterByEmployee,
		filteredTaskIds,
		pickedPlanIds
	]);

	const showsTabDay = useCallback((day: string) => showsDayIn(currentTab, day), [currentTab]);
	const pendingDays = usePendingPlanDays(plans ?? NO_PLANS, targetEmployeeId, showsTabDay);

	const { dragPlans, onDragEnd } = useDailyPlanTaskOrder(plans);
	if (!dragPlans) return null;
	const hasPlans = Array.isArray(dragPlans) && dragPlans?.length > 0;
	const hasPendingDays = pendingDays.length > 0;
	const showsEmpty = !hasPlans && !hasPendingDays;
	const showsDefaultEmpty = showsEmpty && !emptyState;

	return (
		<div className={TASK_LIST_STACK}>
			<PendingPlanDayBlocks days={pendingDays} view={view} />
			{hasPlans && (
				<PlanDayGroupList
					plans={dragPlans}
					onDragEnd={onDragEnd}
					defaultOpenDays={defaultOpenDays(currentTab, dragPlans)}
					view={view}
					profile={profile}
					headerMode={currentTab}
					rowPlanMode={cardPlanModeFor(currentTab)}
					showsPendingCards={true}
				/>
			)}
			{showsEmpty && emptyState}
			{showsDefaultEmpty && <EmptyPlans planMode="Past Tasks" />}
		</div>
	);
}
