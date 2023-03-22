import { getPublicOrganizationTeamsAPI } from '@app/services/client/api/public-organization-team';
import { useCallback } from 'react';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTeamTasks } from './useTeamTasks';

export function usePublicOrganizationTeams() {
	const { loading, queryCall } = useQuery(getPublicOrganizationTeamsAPI);
	const { setTeams } = useOrganizationTeams();
	const { setAllTasks } = useTeamTasks();

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			return queryCall(profileLink, teamId).then((res) => {
				if (res.data?.data?.status === 404) {
					setTeams([]);
					return res;
				}

				setTeams([res.data.data]);
				setAllTasks(res?.data?.data?.tasks || []);
				return res;
			});
		},
		[queryCall, setTeams]
	);

	return {
		loadPublicTeamData,
		loading,
	};
}
