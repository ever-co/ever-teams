import { IHookResponse, IServerError, IUser } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { ApiCall } from '@ever-teams/api';
import type { IApiRequestConfig } from '@ever-teams/api';
import { getWeekStartAndEnd, getStartAndEndOfDay, toast } from '@ever-teams/toolkit-ui';
import QueryString from 'qs';
import { DateRange } from 'react-day-picker';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

interface IProjectStat {
	name: string;
	id: string;
	duration: number;
	durationPercentage: number;
}

export type IProjectsStats = IProjectStat[];

const getProjectsStats = async (
	user: IUser | null,
	token: string,
	selectedEmployee: string,
	selectedTeam: string,
	organizationId: string,
	dates?: DateRange,
	api?: IApiRequestConfig
): Promise<IProjectsStats | IServerError> => {
	try {
		if (!user) {
			return { error: 'User not found' } as IServerError;
		}

		const { tenantId } = user;
		const employeeId =
			user && user.employee ? user.employee.id : selectedEmployee !== 'all' ? selectedEmployee : undefined;

		const weekDates = dates;
		const dayDates = getStartAndEndOfDay();

		const queryObject: Record<string, string | string[] | Date> = {
			tenantId,
			organizationId,
			todayStart: dayDates.dayStart,
			todayEnd: dayDates.dayEnd,
			startDate: weekDates?.from || getWeekStartAndEnd().start,
			endDate: weekDates?.to || getWeekStartAndEnd().end,
			timeZone: user.timeZone
		};

		if (employeeId) {
			queryObject.employeeIds = [employeeId];
		}

		if (selectedTeam !== 'all') {
			queryObject.teamIds = [selectedTeam];
		}

		const query = QueryString.stringify(queryObject);

		const response = await ApiCall<IProjectsStats>(
			{
				path: `/timesheet/statistics/projects?${query}`,
				method: 'GET',
				bearer_token: token,
				tenantId
			},
			api
		);

		if ('data' in response) {
			return response.data;
		}

		if ('message' in response || 'error' in response) return response;

		return { error: 'Failed to fetch projects stats : Unexpected error' } as IServerError;
	} catch (error) {
		return { error: (error as Error).message } as IServerError;
	}
};

const useProjectsStats = (): IHookResponse<IProjectsStats> => {
	const {
		authenticatedUser: user,
		token,
		selectedEmployee,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();
	const { api } = useKitOptions();

	const [projectsStats, setProjectsStats] = useState<IHookResponse<IProjectsStats>>({ data: null, loading: false });

	useEffect(() => {
		// A read the effect has moved past (other filters or another address, or the widget gone) shows nothing, not even
		// its error: the toasts are the page's
		let current = true;
		if (user && organizationId) {
			(async () => {
				try {
					setProjectsStats((prev) => ({ ...prev, loading: true }));

					const userStats = await getProjectsStats(
						user,
						token,
						selectedEmployee,
						selectedTeam,
						organizationId,
						date,
						api
					);
					if (!current) {
						return;
					}

					if ('message' in userStats || 'error' in userStats) {
						const errorMessage =
							'message' in userStats
								? Array.isArray(userStats.message)
									? userStats.message.join(', ')
									: userStats.message
								: String(userStats.error);

						toast({
							variant: 'destructive',
							description: errorMessage
						});

						return;
					}
					setProjectsStats({ data: userStats, loading: false });
				} catch (error) {
					if (!current) {
						return;
					}
					toast({
						variant: 'destructive',
						description: (error as Error).message
					});
				} finally {
					if (current) {
						setProjectsStats((prev) => ({ ...prev, loading: false }));
					}
				}
			})();
		}
		return () => {
			current = false;
			// The next read, if any, sets it again
			setProjectsStats((prev) => (prev.loading ? { ...prev, loading: false } : prev));
		};
	}, [user, selectedEmployee, selectedTeam, date, organizationId, api]);

	return projectsStats;
};

export { useProjectsStats };
