import qs from 'qs';
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
		startDate: todayEnd.toISOString(),
		endDate: todayStart.toISOString()
	};
	const query = qs.stringify(params);

	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteEmployeeTimeSlotsRequest({
	bearer_token,
	tenantId,
	organizationId,
	ids
}: {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
	ids: string[];
}) {
	let idParams = '';
	ids.map((id, i) => {
		idParams += `&ids[${i}]=${id}`;
	});
	const params = {
		tenantId: tenantId,
		organizationId: organizationId
	};
	const query = qs.stringify(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query}${idParams}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
