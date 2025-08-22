import { atom } from 'jotai';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { DateRange } from 'react-day-picker';
import { isTestDateRange } from '@/core/lib/helpers/index';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export const dailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});

export const myDailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});

export const profileDailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});

export const ascSortedPlansState = atom((get) => {
	const profileDailyPlans = get(profileDailyPlanListState);
	return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
});

export const futurePlansState = atom((get) => {
	const ascSortedPlans = get(ascSortedPlansState);
	return ascSortedPlans?.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
		return planDate.getTime() >= today.getTime();
	});
});

export const descSortedPlansState = atom((get) => {
	const profileDailyPlans = get(profileDailyPlanListState);
	return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
	);
});

export const pastPlansState = atom((get) => {
	const descSortedPlans = get(descSortedPlansState);
	return descSortedPlans?.filter((plan) => {
		const planDate = new Date(plan.date);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Set today time to exclude timestamps in comparization
		return planDate.getTime() < today.getTime();
	});
});

export const todayPlanState = atom((get) => {
	const profileDailyPlans = get(profileDailyPlanListState);
	return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].filter((plan) =>
		plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0])
	);
});

export const todayTasksState = atom((get) => {
	const todayPlan = get(todayPlanState);
	return todayPlan
		.map((plan) => {
			return plan.tasks ? plan.tasks : [];
		})
		.flat();
});

export const futureTasksState = atom((get) => {
	const futurePlans = get(futurePlansState);
	return futurePlans
		.map((plan) => {
			return plan.tasks ? plan.tasks : [];
		})
		.flat();
});

export const outstandingPlansState = atom((get) => {
	const profileDailyPlans = get(profileDailyPlanListState);
	const todayTasks = get(todayTasksState);
	const futureTasks = get(futureTasksState);
	return (
		[...(profileDailyPlans.items ? profileDailyPlans.items : [])]
			// Exclude today plans
			.filter((plan) => !plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]))

			// Exclude future plans
			.filter((plan) => {
				const planDate = new Date(plan.date);
				const today = new Date();
				today.setHours(23, 59, 59, 0); // Set today time to exclude timestamps in comparization
				return planDate.getTime() <= today.getTime();
			})
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.map((plan) => ({
				...plan,
				// Include only no completed tasks
				tasks: plan.tasks?.filter((task) => task.status !== 'completed')
			}))
			.map((plan) => ({
				...plan,
				// Include only tasks that are not added yet to the today plan or future plans
				tasks: plan.tasks?.filter(
					(_task) => ![...todayTasks, ...futureTasks].find((task) => task.id === _task.id)
				)
			}))
			.filter((plan) => plan.tasks?.length && plan.tasks.length > 0)
	);
});

export const sortedPlansState = atom((get) => {
	const profileDailyPlans = get(profileDailyPlanListState);
	return [...(profileDailyPlans.items ? profileDailyPlans.items : [])].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
});

export const employeePlansListState = atom<TDailyPlan[]>([]);

export const taskPlans = atom<TDailyPlan[]>([]);

export const activeDailyPlanIdState = atom<string | null>(null);

export const dailyPlanFetchingState = atom<boolean>(false);

export const activeDailyPlanState = atom<TDailyPlan | null>((get) => {
	const dailyPlans = get(dailyPlanListState);
	const activeId = get(activeDailyPlanIdState);
	return dailyPlans.items.find((plan) => plan.id === activeId) || dailyPlans.items[0] || null;
});

export const dataDailyPlanState = atom<TDailyPlan[]>([]);

export const dateRangeDailyPlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

const createFilteredDailyPlanDataSelector = (
	dateRangeState: typeof dateRangePastPlanState,
	originalDataState: typeof originalPastPlanDataState
) =>
	atom((get) => {
		const dateRange = get(dateRangeState);
		const data = get(originalDataState);
		if (!dateRange || !data.length) return data;
		const { from, to } = dateRange;
		if (!from && !to) return data;
		return data.filter((plan) => {
			const itemDate = new Date(plan.date);
			return isTestDateRange(itemDate, from, to);
		});
	});
export const dataDailyPlanAllFilterState = atom<TDailyPlan[]>([]);
export const dateRangeAllPlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

export const setCreateFilteredDailyPlanDataSelector = atom((get) => {
	const dateRange = get(dateRangeAllPlanState);
	const data = get(dataDailyPlanAllFilterState);
	if (!dateRange || !data.length) return data;
	const { from, to } = dateRange;
	if (!from && !to) {
		return data;
	}
	return data.filter((plan) => {
		const itemDate = new Date(plan.date);
		return isTestDateRange(itemDate, from, to);
	});
});

export const dataDailyPlanCountFilterState = atom<number>(0);
export const dateRangePastPlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

export const dateRangeFuturePlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});
export const dateRangeLimitState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

export const originalFuturePlanState = atom<TDailyPlan[]>([]);
export const originalAllPlanState = atom<TDailyPlan[]>([]);
export const originalPastPlanDataState = atom<TDailyPlan[]>([]);

export const filteredPastPlanDataState = createFilteredDailyPlanDataSelector(
	dateRangePastPlanState,
	originalPastPlanDataState
);

export const filteredFuturePlanDataState = createFilteredDailyPlanDataSelector(
	dateRangeFuturePlanState,
	originalFuturePlanState
);

export const filteredAllPlanDataState = createFilteredDailyPlanDataSelector(
	dateRangeAllPlanState,
	originalAllPlanState
);

export const getFirstAndLastDateState = atom((get) => {
	const itemsData = get(dataDailyPlanState);
	if (!itemsData?.length) return { from: null, to: null };
	const sortedData = itemsData?.slice().sort((a, b) => new Date(a.date)?.getTime() - new Date(b?.date).getTime());
	return {
		from: new Date(sortedData[0]?.date),
		to: new Date(sortedData[sortedData.length - 1]?.date)
	};
});

export const getPlanState = atom((get) => {
	const itemsData = get(dataDailyPlanState);
	if (!itemsData?.length) return { data: [] };
	return {
		data: itemsData
	};
});
