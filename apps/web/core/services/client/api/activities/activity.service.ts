import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import qs from 'qs';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';

import { IActivityReport } from '@/core/types/interfaces/activity/activity-report';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';
import { activitySchema, TActivity } from '@/core/types/schemas/activities/activity.schema';

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
	}): Promise<TActivity[]> => {
		try {
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

			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/timesheet/activity?${query}`
				: `/timer/timesheet?${query}`;

			const response = await this.get<TActivity[]>(endpoint);

			// Validate each activity in the response array
			if (Array.isArray(response.data)) {
				const validatedActivities = response.data.map((activity, index) =>
					validateApiResponse(activitySchema, activity, `getActivities API response item ${index}`)
				);
				return validatedActivities;
			}

			// If response.data is not an array, return empty array
			return [];
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Get activities validation failed:',
					{
						message: error.message,
						issues: error.issues,
						taskId,
						tenantId,
						organizationId
					},
					'ActivityService'
				);
			}
			throw error;
		}
	};

	/**
	 * Get daily activities with validation
	 *
	 * @param params - Daily activities request parameters
	 * @returns Promise<TActivity[]> - Validated daily activities data
	 * @throws ValidationError if response data doesn't match schema
	 */
	getDailyActivities = async (params: {
		tenantId: string;
		organizationId: string;
		employeeId: string;
		todayEnd: Date;
		todayStart: Date;
		type?: string;
		title?: string;
	}): Promise<TActivity[]> => {
		try {
			const queryParams: {
				tenantId: string;
				organizationId: string;
				'employeeIds[0]': string;
				startDate: string;
				endDate: string;
				'types[0]'?: string;
				'title[0]'?: string;
			} = {
				tenantId: params.tenantId,
				organizationId: params.organizationId,
				'employeeIds[0]': params.employeeId,
				startDate: params.todayStart.toISOString(),
				endDate: params.todayEnd.toISOString()
			};
			if (params.type) queryParams['types[0]'] = params.type;
			if (params.title) queryParams['title[0]'] = params.title;
			const query = qs.stringify(queryParams);

			const endpoint = GAUZY_API_BASE_SERVER_URL.value
				? `/timesheet/activity/daily?${query}`
				: `/timer/daily?${query}`;

			const response = await this.get<TActivity[]>(endpoint);

			// Validate the response data using Zod schema
			if (Array.isArray(response.data)) {
				const validatedActivities = response.data.map((activity, index) =>
					validateApiResponse(activitySchema, activity, `getDailyActivities API response item ${index}`)
				);
				return validatedActivities;
			}

			// If response.data is not an array, return empty array
			return [];
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Daily activities validation failed:',
					{
						message: error.message,
						issues: error.issues,
						employeeId: params.employeeId,
						tenantId: params.tenantId,
						organizationId: params.organizationId
					},
					'ActivityService'
				);
			}
			throw error;
		}
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
		logType?: ETimeLogType[];
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
