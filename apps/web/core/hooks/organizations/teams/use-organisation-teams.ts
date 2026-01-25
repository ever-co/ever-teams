import { useMemo } from 'react';
import { useGetOrganizationTeamsQuery } from './use-get-organization-teams-query';

// const { teams } = useOrganisationTeams();
export const useOrganisationTeams = () => {
	const { data: teamsResult } = useGetOrganizationTeamsQuery();
	const teams = useMemo(() => teamsResult?.data?.items ?? [], [teamsResult]);

	return { teams };
};
