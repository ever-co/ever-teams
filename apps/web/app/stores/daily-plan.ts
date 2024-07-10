import { atom, selector } from 'recoil';
import { IDailyPlan, PaginationResponse } from '@app/interfaces';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

export const dailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	key: 'dailyPlanListState',
	default: { items: [], total: 0 }
});

export const dateRangeState = atom<DateRange | undefined>({
	key: 'dateRangeState',
	default: ({
		from: new Date(2024, 6, 9),
		to: addDays(new Date(2024, 6, 20), 1),
	}),
})
export const originalDataState = atom<IDailyPlan[]>({
	key: 'originalDataState',
	default: []
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
