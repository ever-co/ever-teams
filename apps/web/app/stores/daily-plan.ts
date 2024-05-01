import { atom, selector } from 'recoil';
import { IDailyPlan } from '@app/interfaces/IDailyPlan';

export const dailyPlanListState = atom<IDailyPlan[]>({
	key: 'dailyPlanListState',
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
		return dailyPlans.find((plan) => plan.id === activeId) || dailyPlans[0] || null;
	}
});
