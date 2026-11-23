import { IHookResponse, IServerError, IUser } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { ApiCall } from '@ever-teams/api';
import { getWeekStartAndEnd, getTodaySoFar, toast } from '@ever-teams/toolkit-ui';
import QueryString from 'qs';
import { DateRange } from 'react-day-picker';
import { useTeamsContext } from '@lib/context/teams-context';
import { pickedEmployeeOf, reportEmployeeIdOf } from '@lib/utils/report-employee';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { useTimerOnlyToken } from '@hooks/useTimerOnlyToken';

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
		selectedEmployee: employeeInPicker,
		userPermissions,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();
	// The employee picked counts only for a person who may pick one (#5631)
	const selectedEmployee = pickedEmployeeOf(employeeInPicker, userPermissions);
	const { api } = useKitOptions();
	const timerOnly = useTimerOnlyToken();
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
			const dayDates = getTodaySoFar();

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

			const employeeId = reportEmployeeIdOf(user, selectedEmployee);
			if (employeeId) objetQuery.employeeIds = [employeeId];

			if (selectedTeam != 'all') objetQuery.teamIds = [selectedTeam];

			const response = await ApiCall<IStatisticsCounts>(
				{
					path: `/timesheet/statistics/counts?${QueryString.stringify(objetQuery, { skipNulls: true })}`,
					method: 'GET',
					bearer_token: token,
					tenantId
				},
				api
			);

			if ('data' in response) return response.data;

			if ('error' in response || 'message' in response) return response;

			return { message: 'Unexpected error format : ' + response } as IServerError;
		} catch (error) {
			return { message: (error as Error).message } as IServerError;
		}
	};

	useEffect(() => {
		// An embed token reaches the timer only: no read, so no refusal to show (#5602)
		if (timerOnly) {
			return;
		}
		// A read the effect has moved past (other filters or another address, or the widget gone) shows nothing, not
		// even its error: the toasts are the page's
		let current = true;
		if (user && organizationId) {
			(async () => {
				setStatisticsCounts((stats) => ({ ...stats, loading: true }));

				const userStats = await getStatisticsCounts(user, token, selectedEmployee, selectedTeam, date);
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

					setStatisticsCounts((stats) => ({ ...stats, loading: false }));
					return;
				}
				setStatisticsCounts({ data: userStats, loading: false });
			})();
		}
		return () => {
			current = false;
			// The next read, if any, sets it again
			setStatisticsCounts((prev) => (prev.loading ? { ...prev, loading: false } : prev));
		};
	}, [user, selectedEmployee, selectedTeam, date, organizationId, timerOnly, api]);

	return statisticsCounts;
};

export { useStatisticsCounts };
