import { ITimerSlotDataRequest } from '@app/interfaces/timer/ITimerSlot';
import { serverFetch } from '../../fetch';

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
	const query = new URLSearchParams(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/timer/status?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
