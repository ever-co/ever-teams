import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import qs from 'qs';
import { ITaskTimesheet, ITimerApps } from '@/core/types/interfaces';

class ActivityService extends APIService {
	async getTaskTimesheet({
		taskId,
		tenantId,
		organizationId,
		defaultRange,
		unitOfTime
	}: {
		tenantId: string;
		organizationId: string;
		defaultRange?: string;
		taskId?: string;
		unitOfTime?: 'day';
	}) {
		const params: {
			tenantId: string;
			organizationId: string;
			defaultRange?: string;
			'taskIds[0]'?: string;
			unitOfTime?: 'day';
		} = {
			'taskIds[0]': taskId,
			tenantId,
			organizationId,
			defaultRange,
			unitOfTime
		};
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? `/timesheet/activity?${query}` : `/timer/timesheet?${query}`;

		return this.get<ITaskTimesheet[]>(endpoint);
	}

	async getTimerDaily({
		tenantId,
		organizationId,
		employeeId,
		todayEnd,
		todayStart,
		type,
		title
	}: {
		tenantId: string;
		organizationId: string;
		employeeId: string;
		todayEnd: Date;
		todayStart: Date;
		type?: string | undefined;
		title?: string;
	}) {
		const params: {
			tenantId: string;
			organizationId: string;
			'employeeIds[0]': string;
			startDate: string;
			endDate: string;
			'types[0]'?: string;
			'title[0]'?: string;
		} = {
			tenantId: tenantId,
			organizationId: organizationId,
			'employeeIds[0]': employeeId,
			startDate: todayStart.toISOString(),
			endDate: todayEnd.toISOString()
		};
		if (type) params['types[0]'] = type;
		if (title) params['title[0]'] = title;
		const query = qs.stringify(params);

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/timesheet/activity/daily?${query}`
			: `/timer/daily?${query}`;

		return this.get<ITimerApps[]>(endpoint);
	}
}

export const activityService = new ActivityService(GAUZY_API_BASE_SERVER_URL.value);
