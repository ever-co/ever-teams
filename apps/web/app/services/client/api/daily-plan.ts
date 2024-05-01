import { ICreateDailyPlan } from '@app/interfaces/IDailyPlan';
import { post } from '../axios';

export function createDailyPlanAPI(data: ICreateDailyPlan, tenantId?: string) {
	return post<ICreateDailyPlan>('/daily-plan', data, {
		tenantId
	});
}
