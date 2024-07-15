import { atom, RecoilState, selector } from 'recoil';
import { IDailyPlan, PaginationResponse } from '@app/interfaces';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { isTestDateRange } from '@app/helpers';

const today = new Date();
const oneWeekAgo = new Date();
oneWeekAgo.setDate(today.getDate() - 7);

export const dailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	key: 'dailyPlanListState',
	default: { items: [], total: 0 }
});

export const myDailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	key: 'myDailyPlanListState',
	default: { items: [], total: 0 }
});

export const profileDailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	key: 'profileDailyPlanListState',
	default: { items: [], total: 0 }
});

export const employeePlansListState = atom<IDailyPlan[]>({
	key: 'employeePlansListState',
	default: []
});

export const taskPlans = atom<IDailyPlan[]>({
	key: 'taskPlansList',
	default: []
});

export const activeDailyPlanIdState = atom<string | null>({
	key: 'activeDailyPlanIdService',
	default: null
});

export const dailyPlanFetchingState = atom<boolean>({
	key: 'dailyPlanFetchingState',
	default: false
});

export const activeDailyPlanState = selector<IDailyPlan | null>({
	key: 'activeDailyPlanState',
	get: ({ get }) => {
		const dailyPlans = get(dailyPlanListState);
		const activeId = get(activeDailyPlanIdState);
		return dailyPlans.items.find((plan) => plan.id === activeId) || dailyPlans.items[0] || null;
	}
});
const createDailyPlanCountFilterAtom = (key: string | any) => atom<number>(
	{
		key,
		default: 0
	}
)

const createDailyPlanAtom = (key: string | any) => atom<IDailyPlan[]>({
	key,
	default: [],
});

const createDateRangeAtom = (key: string | any) => atom<DateRange | undefined>({
	key,
	default: {
		from: oneWeekAgo,
		to: addDays(today, 3),
	},
});

const createFilteredDailyPlanDataSelector = (key: string | any, dateRangeState: RecoilState<DateRange | undefined>, originalDataState: RecoilState<IDailyPlan[]>) => selector({
	key,
	get: ({ get }) => {
		const dateRange = get(dateRangeState);
		const data = get(originalDataState);
		if (!dateRange || !data.length) return data;
		const { from, to } = dateRange;
		return data.filter((plan) => {
			const itemDate = new Date(plan.date);
			return isTestDateRange(itemDate, from, to);
		});
	},
});
export const dataDailyPlanCountFilterState = createDailyPlanCountFilterAtom('dataDailyPlanCountFilterState');
export const dateRangePastPlanState = createDateRangeAtom('dateRangePastPlanState');
export const dateRangeFuturePlanState = createDateRangeAtom('dateRangeFuturePlanState');
export const dateRangeAllPlanState = createDateRangeAtom('dateRangeAllPlanState');

export const originalFuturePlanState = createDailyPlanAtom('originalFuturePlanState');
export const originalAllPlanState = createDailyPlanAtom('originalAllPlanState');
export const originalPastPlanDataState = createDailyPlanAtom('originalPastPlanDataState');

export const filteredPastPlanDataState = createFilteredDailyPlanDataSelector(
	'filteredPastPlanDataState',
	dateRangePastPlanState,
	originalPastPlanDataState
);

export const filteredFuturePlanDataState = createFilteredDailyPlanDataSelector(
	'filteredFuturePlanDataState',
	dateRangeFuturePlanState,
	originalFuturePlanState
);

export const filteredAllPlanDataState = createFilteredDailyPlanDataSelector(
	'filteredAllPlanDataState',
	dateRangeAllPlanState,
	originalAllPlanState
);
