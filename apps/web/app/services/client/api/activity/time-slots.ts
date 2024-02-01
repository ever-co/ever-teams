import { get } from '@app/services/client/axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { ITimerSlotDataRequest } from '@app/interfaces/timer/ITimerSlot';

export async function getTimerLogsRequestAPI({
	tenantId,
	organizationId,
	employeeId,
	todayEnd,
	todayStart
}: {
	tenantId: string;
	organizationId: string;
	employeeId: string;
	todayEnd: Date;
	todayStart: Date;
}) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId,
		todayEnd: todayEnd.toISOString(),
		todayStart: todayStart.toISOString()
	};
	const query = new URLSearchParams(params);
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/statistics/time-slots?${query.toString()}`
		: `/timer/slots?${query.toString()}`;

	return get<ITimerSlotDataRequest | ITimerSlotDataRequest[]>(endpoint);
}

export async function deleteTimerLogsRequestAPI({
	tenantId,
	organizationId,
	ids
}: {
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
	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/statistics/time-slots?${query.toString()}${idParams}`
		: `/timer/slots?${query.toString()}${idParams}`;

	return get(endpoint);
}
