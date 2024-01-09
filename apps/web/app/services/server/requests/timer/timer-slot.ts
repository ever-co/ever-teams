import { IEmployee } from '@app/interfaces/IEmployee';
import { serverFetch } from '../../fetch';

export function getEmployeeTimeSlots(
	bearer_token: string,
	tenantId: string,
	organizationId: string,
	todayEnd: Date,
	endDate: Date,
	todayStart: Date,
	startDate: Date,
	employeeId: string
) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId,
		todayEnd: todayEnd.toLocaleTimeString(),
		todayStart: todayStart.toLocaleTimeString(),
		startDate: startDate.toLocaleTimeString(),
		endDate: endDate.toLocaleTimeString()
	};
	const query = new URLSearchParams(params);
	return serverFetch<IEmployee>({
		path: `/timesheet/statistics/time-slots?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
