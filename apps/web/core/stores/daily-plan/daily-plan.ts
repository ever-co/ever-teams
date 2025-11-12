import { atom } from 'jotai';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { DateRange } from 'react-day-picker';
import { isTestDateRange } from '@/core/lib/helpers/index';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';

export const dailyPlanListState = atom<PaginationResponse<TDailyPlan>>({
	items: [],
	total: 0
});

export const activeDailyPlanIdState = atom<string | null>(null);

export const dataDailyPlanState = atom<TDailyPlan[]>([]);

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
export const dateRangeAllPlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

export const dateRangePastPlanState = atom<DateRange | undefined>({
	from: undefined,
	to: undefined
});

export const dateRangeFuturePlanState = atom<DateRange | undefined>({
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

export const getPlanState = atom((get) => {
	const itemsData = get(dataDailyPlanState);
	if (!itemsData?.length) return { data: [] };
	return {
		data: itemsData
	};
});
