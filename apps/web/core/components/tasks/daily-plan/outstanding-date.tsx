import { useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { EmptyPlans } from '@/core/components/daily-plan';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import { I_UserProfilePage } from '@/core/hooks';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { filterDailyPlansByEmployee, filterDailyPlansByTasks } from '@/core/hooks/daily-plans/use-filter-date-range';
import { useDailyPlanTaskOrder } from '@/core/hooks/daily-plans/use-daily-plan-task-order';
import { TASK_LIST_STACK } from '@/core/components/tasks/task-row-recipes';
import { PlanDayGroupList } from './plan-day-groups';
import { keepPickedPlans, planDayKeyOf } from './plan-picks';

interface IOutstandingFilterDate {
	profile: I_UserProfilePage;
	user?: TUser;
	outstandingPlans: TDailyPlan[];
	filterByEmployee?: boolean; // Filter tasks by employee (default: false = show all tasks)
	filteredTaskIds?: string[]; // Filter plans by taskIds (default undefined = show all)
	pickedPlanIds?: string[];
	emptyState?: ReactNode;
}

function defaultOpenDays(plans: TDailyPlan[]) {
	const firstPlan = plans[0];
	if (!firstPlan) {
		return [];
	}
	return [planDayKeyOf(firstPlan)];
}

export function OutstandingFilterDate({
	profile,
	user,
	outstandingPlans,
	filterByEmployee = false,
	filteredTaskIds,
	pickedPlanIds,
	emptyState
}: Readonly<IOutstandingFilterDate>) {
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	const filteredPlans = useMemo(() => {
		let filteredData = keepPickedPlans(outstandingPlans, pickedPlanIds);

		if (filterByEmployee) {
			filteredData = filterDailyPlansByEmployee(filteredData, user);
		}

		if (filteredTaskIds && filteredData) {
			filteredData = filterDailyPlansByTasks(filteredData, filteredTaskIds);
		}

		return filteredData;
	}, [outstandingPlans, user, filterByEmployee, filteredTaskIds, pickedPlanIds]);

	const { dragPlans: plans, onDragEnd } = useDailyPlanTaskOrder(filteredPlans);
	const hasPlans = plans?.length > 0;
	const showsDefaultEmpty = !hasPlans && !emptyState;

	return (
		<div className={TASK_LIST_STACK}>
			{hasPlans && (
				<PlanDayGroupList
					plans={plans}
					onDragEnd={onDragEnd}
					defaultOpenDays={defaultOpenDays(plans)}
					view={view}
					profile={profile}
					headerMode="Outstanding"
					rowPlanMode="Outstanding"
					tablePlanMode="Outstanding"
					passesPlanToRows={false}
				/>
			)}
			{!hasPlans && emptyState}
			{showsDefaultEmpty && <EmptyPlans planMode="Outstanding" />}
		</div>
	);
}
