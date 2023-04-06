import { getPublicOrganizationTeamsAPI } from '@app/services/client/api/public-organization-team';
import { publicactiveTeamState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useTeamTasks } from './useTeamTasks';

export function usePublicOrganizationTeams() {
	const { loading, queryCall } = useQuery(getPublicOrganizationTeamsAPI);
	const { activeTeam, setTeams } = useOrganizationTeams();
	const { setAllTasks } = useTeamTasks();
	const [publicTeam, setPublicTeam] = useRecoilState(publicactiveTeamState);

	const loadPublicTeamData = useCallback(
		(profileLink: string, teamId: string) => {
			return queryCall(profileLink, teamId).then((res) => {
				if (res.data?.data?.status === 404) {
					setTeams([]);
					return res;
				}

				setTeams([res.data.data]);
				setPublicTeam(res.data.data);
				setAllTasks(res?.data?.data?.tasks || []);
				return res;
			});
		},
		[queryCall, setTeams]
	);

	return {
		loadPublicTeamData,
		loading,
		activeTeam,
		publicTeam,
	};
}
