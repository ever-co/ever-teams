import { useMemo } from 'react';
import { useGetOrganizationTeamsQuery } from './use-get-organization-teams-query';

/**
 * Simplified accessor hook for all organization teams.
 *
 * @description
 * Extracts and memoizes the teams array from the query result.
 * Provides a cleaner API for components that just need the teams list.
 *
 * @example
 * ```tsx
 * const { teams } = useOrganisationTeams();
 *
 * return (
 *   <ul>
 *     {teams.map((team) => <li key={team.id}>{team.name}</li>)}
 *   </ul>
 * );
 * ```
 *
 * @see {@link useGetOrganizationTeamsQuery} - Underlying query hook
 * @see {@link useCurrentTeam} - Get the active team instead
 *
 * @returns Object containing `teams` array (empty array if loading/error)
 */
export const useOrganisationTeams = () => {
	const { data: teamsResult } = useGetOrganizationTeamsQuery();
	const teams = useMemo(() => teamsResult?.data?.items ?? [], [teamsResult]);

	return { teams };
};
