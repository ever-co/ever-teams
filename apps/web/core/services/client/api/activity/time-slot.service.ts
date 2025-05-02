import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { ITimerSlotDataRequest } from '@/core/types/interfaces';
import qs from 'qs';

class TimeSlotsService extends APIService {
	getTimerLogsRequestAPI = async ({
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
	}) => {
		const params = {
			tenantId: tenantId,
			organizationId: organizationId,
			employeeId,
			todayEnd: todayEnd.toISOString(),
			todayStart: todayStart.toISOString()
		} as Record<string, string>;

		const relations = ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId'];

		relations.forEach((rl, i) => {
			params[`relations[${i}]`] = rl;
		});

		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/statistics/time-slots?${query}`
			: `/timer/slots?${query}`;

		return this.get<ITimerSlotDataRequest | ITimerSlotDataRequest[]>(endpoint);
	};

	deleteTimeSlots = async ({
		tenantId,
		organizationId,
		ids
	}: {
		tenantId: string;
		organizationId: string;
		ids: string[];
	}) => {
		let idParams = '';
		ids.map((id, i) => {
			idParams += `&ids[${i}]=${id}`;
		});
		const params = {
			tenantId: tenantId,
			organizationId: organizationId
		} as Record<string, string>;

		const relations = ['timeSlots.timeLogs.projectId', 'timeSlots.timeLogs.taskId'];

		relations.forEach((rl, i) => {
			params[`relations[${i}]`] = rl;
		});
		const query = qs.stringify(params);
		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/statistics/time-slots?${query}${idParams}`
			: `/timer/slots?${query}${idParams}`;

		return this.get(endpoint);
	};
}

export const timeSlotsService = new TimeSlotsService(GAUZY_API_BASE_SERVER_URL.value);
