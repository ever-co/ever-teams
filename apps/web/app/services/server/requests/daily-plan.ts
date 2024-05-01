import { ICreateDailyPlan, IDailyPlan } from '@app/interfaces/IDailyPlan';
import { serverFetch } from '../fetch';

export function createPlanRequest({
	data,
	bearer_token,
	tenantId
}: {
	data: ICreateDailyPlan;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<IDailyPlan>({
		method: 'POST',
		path: '/daily-plan',
		body: data,
		bearer_token,
		tenantId
	});
}
