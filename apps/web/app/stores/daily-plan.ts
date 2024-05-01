import { atom, selector } from 'recoil';
import { IDailyPlan, PaginationResponse } from '@app/interfaces';

export const dailyPlanListState = atom<PaginationResponse<IDailyPlan>>({
	key: 'dailyPlanListState',
	default: { items: [], total: 0 }
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
