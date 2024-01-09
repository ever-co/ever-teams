import { serverFetch } from '../../fetch';
import { ITimerSlotDataRequest } from '@app/interfaces/timer/ITimerSlot';

export function getEmployeeTimeSlotsRequest({
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
		todayEnd: todayEnd.toISOString(),
		todayStart: todayStart.toISOString()
	};
	const query = new URLSearchParams(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
