import { useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import moment from 'moment';
import { FilterTabs } from '@/core/types/interfaces/task/task-card';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import {
	filterDailyPlan,
	filterDailyPlansByEmployee,
	filterDailyPlansByTasks
} from '@/core/hooks/daily-plans/use-filter-date-range';
import { I_UserProfilePage } from '@/core/hooks';
import { TUser } from '@/core/types/schemas';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { EmptyPlans } from '@/core/components/daily-plan';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useDailyPlanTaskOrder } from '@/core/hooks/daily-plans/use-daily-plan-task-order';
import { TASK_LIST_STACK } from '@/core/components/tasks/task-row-recipes';
import { PlanDayGroupList } from './plan-day-groups';
import { keepPickedPlans } from './plan-picks';

function cardPlanModeFor(currentTab: FilterTabs): FilterTabs | undefined {
	if (currentTab === 'Past Tasks') {
		return 'Past Tasks';
	}
	return undefined;
}

function yesterdayKey() {
	return moment().subtract(1, 'day').format('YYYY-MM-DD');
}

export function PastTasks({
	user,
	profile,
	currentTab = 'Past Tasks',
	employeeId: propsEmployeeId,
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
	const employeeId = propsEmployeeId ?? user?.employee?.id ?? user?.employeeId ?? '';
	const { employeePastPlans } = useEmployeeDailyPlans(employeeId);
	const view = useAtomValue(dailyPlanViewHeaderTabs);
	const { date } = useDateRange('Past Tasks', employeeId);

	const filteredPastPlans = useMemo(() => {
		const pickedPlans = keepPickedPlans(employeePastPlans, pickedPlanIds);
		let filteredData = filterDailyPlan(date, pickedPlans);

		if (filterByEmployee && filteredData) {
			filteredData = filterDailyPlansByEmployee(filteredData, user);
		}
		if (filteredTaskIds && filteredData) {
			filteredData = filterDailyPlansByTasks(filteredData, filteredTaskIds);
		}

		return filteredData;
	}, [date, employeePastPlans, user, filterByEmployee, filteredTaskIds, pickedPlanIds]);
	const { dragPlans, onDragEnd } = useDailyPlanTaskOrder(filteredPastPlans);
	if (!filteredPastPlans) return null;
	const hasPlans = dragPlans.length > 0;
	const showsDefaultEmpty = !hasPlans && !emptyState;

	return (
		<div className={TASK_LIST_STACK}>
			{hasPlans && (
				<PlanDayGroupList
					plans={dragPlans}
					onDragEnd={onDragEnd}
					defaultOpenDays={[yesterdayKey()]}
					view={view}
					profile={profile}
					headerMode="Outstanding"
					rowPlanMode={cardPlanModeFor(currentTab)}
				/>
			)}
			{!hasPlans && emptyState}
			{showsDefaultEmpty && <EmptyPlans planMode="Past Tasks" />}
		</div>
	);
}
