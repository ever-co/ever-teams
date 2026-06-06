import { IHookResponse, IServerError, IUser } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { ApiCall } from '@ever-teams/api';
import { getWeekStartAndEnd, getStartAndEndOfDay, toast } from '@ever-teams/toolkit-ui';
import { DateRange } from 'react-day-picker';
import { useTeamsContext } from '@lib/context/teams-context';

interface ITasksStat {
	duration: number;
	durationPercentage: number;
	id: string;
	title: string;
	todayDuration: number;
	updatedAt: string | null;
}

export type ITasksStats = ITasksStat[];

const getTasksStats = async (
	user: IUser | null,
	token: string,
	selectedEmployee: string,
	selectedTeam: string,
	organizationId: string,
	dates?: DateRange
): Promise<ITasksStats | IServerError> => {
	try {
		if (!user) {
			return { error: 'User not found' } as IServerError;
		}

		const { tenantId } = user;
		const employeeId = user.employee?.id || (selectedEmployee !== 'all' ? selectedEmployee : undefined);

		const weekDates = dates;
		const dayDates = getStartAndEndOfDay();

		interface ITasksStatsQuery {
			tenantId: string;
			organizationId: string;
			todayStart: string;
			todayEnd: string;
			startDate: Date;
			endDate: Date;
			timeZone: string;
			employeeIds?: string[];
			teamIds?: string[];
		}

		const query: ITasksStatsQuery = {
			tenantId,
			organizationId,
			todayStart: dayDates.dayStart,
			todayEnd: dayDates.dayEnd,
			startDate: weekDates?.from || getWeekStartAndEnd().start,
			endDate: weekDates?.to || getWeekStartAndEnd().end,
			timeZone: user.timeZone
		};

		if (employeeId) {
			query.employeeIds = [employeeId];
		}

		if (selectedTeam !== 'all') {
			query.teamIds = [selectedTeam];
		}

		const response = await ApiCall<ITasksStats>({
			path: `/timesheet/statistics/tasks`,
			method: 'POST',
			bearer_token: token,
			tenantId,
			body: query
		});

		if ('data' in response) {
			return response.data;
		}

		if ('error' in response || 'message' in response) return response;

		return { error: 'Invalid response' } as IServerError;
	} catch (error) {
		return { message: (error as Error).message } as IServerError;
	}
};

const useTasksStats = (): IHookResponse<ITasksStats> => {
	const {
		authenticatedUser: user,
		token,
		selectedEmployee,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();

	const [tasksStats, setTasksStats] = useState<IHookResponse<ITasksStats>>({ data: null, loading: false });

	useEffect(() => {
		if (user && organizationId) {
			(async () => {
				setTasksStats((prev) => ({ ...prev, loading: true }));

				const userStats = await getTasksStats(
					user,
					token,
					selectedEmployee,
					selectedTeam,
					organizationId,
					date
				);

				if ('message' in userStats || 'error' in userStats) {
					const errorMessage =
						'message' in userStats
							? Array.isArray(userStats.message)
								? userStats.message.join(', ')
								: userStats.message
							: String(userStats.error);

					toast({ description: errorMessage, variant: 'destructive' });
					setTasksStats((prev) => ({ ...prev, loading: false }));

					return;
				}
				setTasksStats({ data: userStats, loading: false });
			})();
		}
	}, [user, selectedEmployee, selectedTeam, date, organizationId]);

	return tasksStats;
};

export { useTasksStats };
