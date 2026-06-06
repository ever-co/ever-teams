import { IServerError, ITimeLog, ITimeLogCreateInput, IUser, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { ApiCall } from '../fetch';
import QueryString from 'qs';
import { DateRange } from 'react-day-picker';

interface IGetTimeLogsParams {
	user: IUser | null;
	token: string;
	organizationId: string;
	date?: DateRange;
	activityLevel?: { start: number; end: number };
	timeZone?: string;
	source?: TimerSource[];
	logType?: LogType[];
	employeeIds?: string[];
}

export const getTimeLogs = async ({
	user,
	token,
	organizationId,
	date,
	activityLevel = { start: 0, end: 100 },
	timeZone,
	source,
	logType,
	employeeIds
}: IGetTimeLogsParams): Promise<ITimeLog[] | IServerError> => {
	try {
		if (!user) {
			throw new Error('User is not authenticated');
		}

		const { tenantId } = user;

		// Use provided timezone or fallback to user's timezone or system default
		const resolvedTimeZone = timeZone || user.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

		// Format dates for API (YYYY-MM-DD HH:mm:ss format)
		const formatDateForApi = (dateObj: Date): string => {
			const year = dateObj.getFullYear();
			const month = String(dateObj.getMonth() + 1).padStart(2, '0');
			const day = String(dateObj.getDate()).padStart(2, '0');
			const hours = String(dateObj.getHours()).padStart(2, '0');
			const minutes = String(dateObj.getMinutes()).padStart(2, '0');
			const seconds = String(dateObj.getSeconds()).padStart(2, '0');
			return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
		};

		// Default to today if no date range provided
		const now = new Date();
		const startOfDay = new Date(now);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(now);
		endOfDay.setHours(23, 59, 59, 999);

		const startDate = date?.from ? formatDateForApi(date.from) : formatDateForApi(startOfDay);
		const endDate = date?.to ? formatDateForApi(date.to) : formatDateForApi(endOfDay);

		// Build query parameters
		const queryParams: Record<string, unknown> = {
			activityLevel: {
				start: activityLevel.start,
				end: activityLevel.end
			},
			organizationId,
			tenantId,
			startDate,
			endDate,
			timeZone: resolvedTimeZone,
			relations: ['project', 'task', 'organizationContact', 'employee.user']
		};

		// Add optional source filter
		if (source && source.length > 0) {
			queryParams.source = source;
		}

		// Add optional logType filter
		if (logType && logType.length > 0) {
			queryParams.logType = logType;
		}

		// Add optional employeeIds filter
		if (employeeIds && employeeIds.length > 0) {
			queryParams.employeeIds = employeeIds;
		}

		const query = QueryString.stringify(queryParams, { arrayFormat: 'indices' });

		const response = await ApiCall<ITimeLog[]>({
			method: 'GET',
			path: `/timesheet/time-log?${query}`,
			bearer_token: token,
			tenantId
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response as IServerError;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

export const addManualTime = async ({
	token,
	body
}: {
	token: string;
	body: ITimeLogCreateInput;
}): Promise<ITimeLog | IServerError> => {
	try {
		const response = await ApiCall<ITimeLog>({
			method: 'POST',
			path: `/timesheet/time-log`,
			bearer_token: token,
			tenantId: body.tenantId,
			body
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) {
			return response as IServerError;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};
