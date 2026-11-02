import { useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import moment from 'moment';
import { EmptyPlans } from '@/core/components/daily-plan';
import { dailyPlanViewHeaderTabs } from '@/core/stores/common/header-tabs';
import {
	filterDailyPlan,
	filterDailyPlansByEmployee,
	filterDailyPlansByTasks
} from '@/core/hooks/daily-plans/use-filter-date-range';
import { I_UserProfilePage } from '@/core/hooks';
import { TUser } from '@/core/types/schemas';
import { useDateRange } from '@/core/hooks/daily-plans/use-date-range';
import { useEmployeeDailyPlans } from '@/core/hooks/daily-plans/use-employee-daily-plans';
import { useDailyPlanTaskOrder } from '@/core/hooks/daily-plans/use-daily-plan-task-order';
import { PendingPlanDayBlocks } from '@/core/components/features/daily-plan/pending-plan-tasks';
import { usePendingPlanDays } from '@/core/hooks/daily-plans/use-pending-plan-additions';
import { todayKey } from '@/core/lib/utils/daily-plan-editor';
import { TASK_LIST_STACK } from '@/core/components/tasks/task-row-recipes';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { PlanDayGroupList } from './plan-day-groups';
import { keepPickedPlans } from './plan-picks';

const NO_PLANS: TDailyPlan[] = [];

function isFutureDay(day: string) {
	return day > todayKey();
}

function tomorrowKey() {
	return moment().add(1, 'day').format('YYYY-MM-DD');
}

export function FutureTasks({
	profile,
	user,
	employeeId,
	filterByEmployee = false,
	filteredTaskIds,
	pickedPlanIds,
	emptyState
}: Readonly<{
	profile: I_UserProfilePage;
	user?: TUser;
	employeeId?: string; // Accept employeeId directly from parent
	filterByEmployee?: boolean; // Filter tasks by employee (default: false = show all tasks)
	filteredTaskIds?: string[]; // Filter plans by taskIds (default undefined = show all)
	pickedPlanIds?: string[];
	emptyState?: ReactNode;
}>) {
	const targetEmployeeId = employeeId ?? user?.employee?.id ?? user?.employeeId ?? '';
	const { employeeFuturePlans } = useEmployeeDailyPlans(targetEmployeeId);
	const { date } = useDateRange('Future Tasks', targetEmployeeId);
	const view = useAtomValue(dailyPlanViewHeaderTabs);

	const futureDailyPlanTasks = useMemo(() => {
		const pickedPlans = keepPickedPlans(employeeFuturePlans, pickedPlanIds);
		let filteredData = filterDailyPlan(date, pickedPlans);

		if (filterByEmployee && filteredData) {
			filteredData = filterDailyPlansByEmployee(filteredData, user);
		}

		if (filteredTaskIds && filteredData) {
			filteredData = filterDailyPlansByTasks(filteredData, filteredTaskIds);
		}

		return filteredData;
	}, [date, employeeFuturePlans, user, filterByEmployee, filteredTaskIds, pickedPlanIds]);

	const pendingDays = usePendingPlanDays(futureDailyPlanTasks ?? NO_PLANS, targetEmployeeId, isFutureDay);
	const { dragPlans, onDragEnd } = useDailyPlanTaskOrder(futureDailyPlanTasks);

	if (!futureDailyPlanTasks) return null;
	const hasPlans = dragPlans.length > 0;
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
					defaultOpenDays={[tomorrowKey()]}
					view={view}
					profile={profile}
					headerMode="Future Tasks"
					rowPlanMode="Future Tasks"
					showsPendingCards={true}
				/>
			)}
			{showsEmpty && emptyState}
			{showsDefaultEmpty && <EmptyPlans planMode="Past Tasks" />}
		</div>
	);
}
