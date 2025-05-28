import { atom } from 'jotai';
import { IDailyPlan } from '@/core/types/interfaces/daily-plan/daily-plan';
import { PaginationResponse } from '@/core/types/interfaces/global/data-response';
import { DateRange } from 'react-day-picker';
import { isTestDateRange } from '@/core/lib/helpers/index';

export const dailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	items: [],
	total: 0
});

export const myDailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	items: [],
	total: 0
});

export const profileDailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	items: [],
	total: 0
});

export const employeePlansListState = atom<IDailyPlan[]>([]);

export const taskPlans = atom<IDailyPlan[]>([]);

export const activeDailyPlanIdState = atom<string | null>(null);

export const dailyPlanFetchingState = atom<boolean>(false);

export const activeDailyPlanState = atom<IDailyPlan | null>((get) => {
	const dailyPlans = get(dailyPlanListState);
	const activeId = get(activeDailyPlanIdState);
	return dailyPlans.items.find((plan) => plan.id === activeId) || dailyPlans.items[0] || null;
});

export const dataDailyPlanState = atom<IDailyPlan[]>([]);

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
export const dataDailyPlanAllFilterState = atom<IDailyPlan[]>([]);
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

export const originalFuturePlanState = atom<IDailyPlan[]>([]);
export const originalAllPlanState = atom<IDailyPlan[]>([]);
export const originalPastPlanDataState = atom<IDailyPlan[]>([]);

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
