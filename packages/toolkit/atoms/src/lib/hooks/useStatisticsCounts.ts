import { IHookResponse, IServerError, IUser } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { ApiCall } from '@ever-teams/api';
import { getWeekStartAndEnd, getStartAndEndOfDay, toast } from '@ever-teams/toolkit-ui';
import QueryString from 'qs';
import { DateRange } from 'react-day-picker';
import { useTeamsContext } from '@lib/context/teams-context';

export interface IStatisticsCounts {
	employeesCount: number;
	projectsCount: number;
	todayActivities: number;
	todayDuration: number;
	weekActivities: number;
	weekDuration: number;
}

const useStatisticsCounts = (): IHookResponse<IStatisticsCounts> => {
	const {
		authenticatedUser: user,
		token,
		selectedEmployee,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();
	const [statisticsCounts, setStatisticsCounts] = useState<IHookResponse<IStatisticsCounts>>({
		data: {
			employeesCount: 0,
			projectsCount: 0,
			todayActivities: 0,
			todayDuration: 0,
			weekActivities: 0,
			weekDuration: 0
		},
		loading: false
	});

	const getStatisticsCounts = async (
		user: IUser | null,
		token: string,
		selectedEmployee: string,
		selectedTeam: string,
		dates?: DateRange
	) => {
		try {
			if (!user) throw new Error('User is not authenticated');

			const { tenantId } = user;

			const weekDates = dates;
			const dayDates = getStartAndEndOfDay();

			const objetQuery: {
				tenantId: string;
				organizationId?: string | null;
				todayStart: string;
				todayEnd: string;
				startDate: Date;
				endDate: Date;
				timeZone: string;
				employeeIds?: string[];
				teamIds?: string[];
			} = {
				tenantId,
				organizationId,
				todayStart: dayDates.dayStart,
				todayEnd: dayDates.dayEnd,
				startDate: weekDates?.from || getWeekStartAndEnd().start,
				endDate: weekDates?.to || getWeekStartAndEnd().end,
				timeZone: user?.timeZone?.split(' ')[0] || Intl.DateTimeFormat().resolvedOptions().timeZone
			};

			if (user.employee) objetQuery.employeeIds = [user.employee.id];

			if (selectedEmployee != 'all') objetQuery.employeeIds = [selectedEmployee];

			if (selectedTeam != 'all') objetQuery.teamIds = [selectedTeam];

			const response = await ApiCall<IStatisticsCounts>({
				path: `/timesheet/statistics/counts?${QueryString.stringify(objetQuery, { skipNulls: true })}`,
				method: 'GET',
				bearer_token: token,
				tenantId
			});

			if ('data' in response) return response.data;

			if ('error' in response || 'message' in response) return response;

			return { message: 'Unexpected error format : ' + response } as IServerError;
		} catch (error) {
			return { message: (error as Error).message } as IServerError;
		}
	};

	useEffect(() => {
		if (user && organizationId) {
			(async () => {
				setStatisticsCounts((stats) => ({ ...stats, loading: true }));

				const userStats = await getStatisticsCounts(user, token, selectedEmployee, selectedTeam, date);

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

					setStatisticsCounts((stats) => ({ ...stats, loading: false }));
					return;
				}
				setStatisticsCounts({ data: userStats, loading: false });
			})();
		}
	}, [user, selectedEmployee, selectedTeam, date, organizationId]);

	return statisticsCounts;
};

export { useStatisticsCounts };
