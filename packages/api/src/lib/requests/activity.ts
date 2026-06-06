import { IActivitiesStats, IServerError, IUser } from '@ever-teams/toolkit-types';
import QueryString from 'qs';
import { ApiCall } from '../fetch';

interface IGetActivitiesStatsParams {
	user: IUser | null;
	token: string;
	selectedEmployee: string;
	selectedTeam: string;
	organizationId: string;
	dates?: {
		from?: Date;
		to?: Date;
	};
	dayDates?: {
		dayStart?: string;
		dayEnd?: string;
	};
}

/**
 * Retrieves statistics for activities based on provided parameters.
 *
 * @param params - The parameters for getting activities statistics
 * @param params.user - The current user object
 * @param params.token - Authentication token
 * @param params.selectedEmployee - Selected employee ID or 'all'
 * @param params.selectedTeam - Selected team ID or 'all'
 * @param params.organizationId - ID of the organization
 * @param params.dates - Date range object containing 'from' and 'to' dates
 * @param params.dayDates - Object containing 'dayStart' and 'dayEnd' timestamps
 *
 * @returns Promise that resolves to either:
 * - IActivitiesStats containing the activities statistics
 * - IServerError containing error information if the request fails
 *
 * @throws Will return an IServerError if an exception occurs during execution
 */
export async function getActivitiesStats({
	user,
	token,
	selectedEmployee,
	selectedTeam,
	organizationId,
	dates,
	dayDates
}: IGetActivitiesStatsParams): Promise<IServerError | IActivitiesStats> {
	try {
		if (!user) return { error: 'User not authenticated' } as IServerError;

		const { tenantId } = user;

		const employeeId = (() => {
			if (user?.employee) {
				return user.employee.id;
			}
			if (selectedEmployee !== 'all') {
				return selectedEmployee;
			}
			return undefined;
		})();

		const query = QueryString.stringify(
			{
				tenantId,
				organizationId,
				todayStart: dayDates?.dayStart,
				todayEnd: dayDates?.dayEnd,
				startDate: dates?.from,
				endDate: dates?.to,
				timeZone: user.timeZone,
				...(employeeId ? { employeeIds: [employeeId] } : {}),
				...(selectedTeam !== 'all' ? { teamIds: [selectedTeam] } : {})
			},
			{ skipNulls: true }
		);

		const activitiesStats = await ApiCall<IActivitiesStats>({
			path: `/timesheet/statistics/activities?${query}`,
			method: 'GET',
			bearer_token: token,
			tenantId
		});

		if ('data' in activitiesStats) {
			return activitiesStats.data;
		}
		if ('error' in activitiesStats || 'message' in activitiesStats) {
			return activitiesStats;
		}

		return { error: 'Unexpected response format' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
}
