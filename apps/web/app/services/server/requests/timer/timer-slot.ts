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
	const query = new URLSearchParams(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query.toString()}`,
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
	const query = new URLSearchParams(params);
	return serverFetch<ITimerSlotDataRequest>({
		path: `/timesheet/statistics/time-slots?${query.toString()}${idParams}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

// https://apidemo.gauzy.co/api/timesheet/time-slot?ids[0]=71bde97d-f6e7-463a-90ef-c752072755ab&organizationId=0289f323-5aa5-4dc2-92c5-633f3e70ecb4&tenantId=ae69bf6c-072f-44cb-8f41-e981a3eccdb1
