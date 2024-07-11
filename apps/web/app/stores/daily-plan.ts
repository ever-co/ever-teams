import { atom, selector } from 'recoil';
import { IDailyPlan, PaginationResponse } from '@app/interfaces';
import { DateRange } from 'react-day-picker';
import { addDays, } from 'date-fns';

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

const today = new Date();
const oneWeekAgo = new Date();
oneWeekAgo.setDate(today.getDate() - 7);

export const dateRangeState = atom<DateRange | undefined>({
	key: 'dateRangeState',
	default: ({
		from: oneWeekAgo,
		to: addDays(today, 3),
	}),
})
export const dateRangeAllState = atom<DateRange | undefined>({
	key: 'dateRangeAllState',
	default: ({
		from: oneWeekAgo,
		to: addDays(today, 3),
	}),
})
export const dateRangePaskState = atom<DateRange | undefined>({
	key: 'dateRangePastPlanState',
	default: ({
		from: oneWeekAgo,
		to: addDays(today, 3),
	}),
})
type dataType = 'Future Tasks' | 'Past Tasks' | 'All Tasks';
export const dataTypeState = atom<dataType>({
	key: 'dataTypePlan',
	default: 'All Tasks'
})


export const originalDataState = atom<IDailyPlan[]>({
	key: 'originalDataState',
	default: []
})
export const originalAllDataState = atom<IDailyPlan[]>({
	key: 'originalAllDataState',
	default: []
})
export const originalPastTaskDataState = atom<IDailyPlan[]>({
	key: 'originalPastDataState',
	default: []
})

function isDateInRange(itemDate: Date, from?: Date, to?: Date): boolean {
	if (from && to) {
		return itemDate >= from && itemDate <= to;
	} else if (from) {
		return itemDate >= from;
	} else if (to) {
		return itemDate <= to;
	} else {
		return true; // or false, depending on your default logic
	}
}
export const filteredDataState = selector({
	key: 'filteredDataState',
	get: ({ get }) => {
		const dateRange = get(dateRangeState);
		const data = get(originalDataState);
		if (!dateRange || !data.length) return data;
		const { from, to } = dateRange;
		return data.filter((plan) => {
			const itemDate = new Date(plan.date); // Ensure you're using the correct date field
			return isDateInRange(itemDate, from, to);
		});
	},
});

export const filteredAllDataState = selector({
	key: 'filteredAllDataState',
	get: ({ get }) => {
		const dateRange = get(dateRangeAllState);
		const data = get(originalAllDataState);
		if (!dateRange || !data.length) return data;
		const { from, to } = dateRange;
		return data.filter((plan) => {
			const itemDate = new Date(plan.date); // Ensure you're using the correct date field
			return isDateInRange(itemDate, from, to);
		});
	},
});
export const filteredPastDataState = selector({
	key: 'filteredPastDataState',
	get: ({ get }) => {
		const dateRange = get(dateRangePaskState);
		const data = get(originalPastTaskDataState);
		if (!dateRange || !data.length) return data;
		const { from, to } = dateRange;
		return data.filter((plan) => {
			const itemDate = new Date(plan.date); // Ensure you're using the correct date field
			return isDateInRange(itemDate, from, to);
		});
	},
});
