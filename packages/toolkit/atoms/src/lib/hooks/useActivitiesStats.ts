import { IHookResponse } from '@ever-teams/toolkit-types';
import { getActivitiesStats } from '@ever-teams/api';
import { useEffect, useState } from 'react';
import { getStartAndEndOfDay, getWeekStartAndEnd, toast } from '@ever-teams/toolkit-ui';
import { IActivitiesStats } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

const useActivitiesStats = (): IHookResponse<IActivitiesStats> => {
	const [activitiesStats, setActivitiesStats] = useState<IHookResponse<IActivitiesStats>>({
		data: null,
		loading: false
	});

	const {
		authenticatedUser: user,
		token,
		selectedEmployee,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();
	const { api } = useKitOptions();

	const fetchActivitiesStats = async () => {
		if (user && organizationId) {
			setActivitiesStats((prev) => ({ ...prev, loading: true }));

			const dayDates = getStartAndEndOfDay();
			const { end, start } = getWeekStartAndEnd();

			const userStats = await getActivitiesStats(
				{
					user,
					token,
					selectedEmployee,
					selectedTeam,
					organizationId,
					dayDates,
					dates: {
						from: date?.from || start,
						to: date?.to || end
					}
				},
				api
			);

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
				setActivitiesStats((prev) => ({ ...prev, loading: false }));
				return;
			}

			setActivitiesStats({ data: userStats, loading: false });
		}
	};

	useEffect(() => {
		fetchActivitiesStats();
	}, [user, selectedEmployee, selectedTeam, date, organizationId, api]);

	return activitiesStats;
};

export { useActivitiesStats };
