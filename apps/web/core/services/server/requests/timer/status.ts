import { ITimerSlotDataRequest } from '@/core/types/interfaces/timer/time-slot/time-slot';
import { serverFetch } from '../../fetch';
import qs from 'qs';

export function getTimerStatusRequest({
	bearer_token,
	tenantId,
	organizationId,
	todayEnd,
	todayStart,
	employeeId
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	todayEnd: Date;
	todayStart: Date;
	employeeId: string;
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId,
		todayStart: todayStart.toISOString(),
		todayEnd: todayEnd.toISOString(),
		'relations[0]': 'employee'
	};

	const query = qs.stringify(params);

	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/timer/status?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
