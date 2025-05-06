import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import qs from 'qs';
import { ITaskTimesheet, ITimerApps, TimeLogType } from '@/core/types/interfaces';
import { IActivityReport } from '@/core/types/interfaces/activity/IActivityReport';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';

class ActivityService extends APIService {
	getActivities = async ({
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
	}) => {
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
	};

	getDailyActivities = async ({
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
		type?: string;
		title?: string;
	}) => {
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
	};

	/**
	 * Get activity report data
	 * @param params Request parameters including activity levels, sources, log types, and date range
	 * @returns Promise with activity report data
	 * @example
	 * const data = await getActivityReport({
	 *   activityLevel: { start: 0, end: 100 },
	 *   organizationId: '45c3dd72-fc2a-4347-868a-1015562f82f4',
	 *   tenantId: '23aa65e0-5c82-4d4e-a8f4-89383b1dccc2',
	 *   startDate: '2025-02-10 00:00:00',
	 *   endDate: '2025-02-16 23:59:59',
	 *   timeZone: 'Etc/UTC',
	 *   groupBy: 'date'
	 * });
	 */
	getActivitiesReport = async ({
		activityLevel = { start: 0, end: 100 },
		organizationId,
		tenantId,
		startDate,
		endDate,
		timeZone = getDefaultTimezone(),
		groupBy = 'date',
		projectIds = [],
		employeeIds = [],
		source = [],
		logType = []
	}: {
		activityLevel?: { start: number; end: number };
		organizationId: string;
		tenantId: string;
		startDate: string | Date;
		endDate: string | Date;
		timeZone?: string;
		groupBy?: string;
		projectIds?: string[];
		employeeIds?: string[];
		source?: string[];
		logType?: TimeLogType[];
	}) => {
		const queryString = qs.stringify(
			{
				activityLevel,
				organizationId,
				tenantId,
				startDate,
				endDate,
				timeZone,
				groupBy,
				...(projectIds.length && { projectIds }),
				...(employeeIds.length && { employeeIds }),
				...(source.length && { source }),
				...(logType.length && { logType })
			},
			{
				arrayFormat: 'indices',
				encode: false
			}
		);

		return this.get<IActivityReport[]>('/timesheet/activity/report?' + queryString, { tenantId });
	};
}

export const activityService = new ActivityService(GAUZY_API_BASE_SERVER_URL.value);
