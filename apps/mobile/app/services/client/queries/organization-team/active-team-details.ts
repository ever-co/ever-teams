import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getOrganizationTeamRequest } from '../../requests/organization-team';
import { IOrganizationTeamWithMStatus } from '../../../interfaces/IOrganizationTeam';

/**
 * A number per teams answer, the same for every component: the teams query keeps the same object while its data does
 * not change, and gives a new one when a member's status or time changes.
 */
const teamsVersions = new WeakMap<object, number>();
let lastTeamsVersion = 0;

function versionOf(teams: object | null | undefined): number {
	if (!teams) {
		return 0;
	}
	const known = teamsVersions.get(teams);
	if (known !== undefined) {
		return known;
	}
	lastTeamsVersion += 1;
	teamsVersions.set(teams, lastTeamsVersion);
	return lastTeamsVersion;
}

interface ActiveTeamDetailsParams {
	tenantId: string;
	organizationId: string;
	activeTeamId: string;
	authToken: string | undefined;
	teams: object | null | undefined;
}

/**
 * The active team with its members' status, fetched again each time the teams answer changes. Every component that
 * asks shares one request: each one used to send its own, about thirty at once while a timer ran.
 */
export function useActiveTeamDetails({
	tenantId,
	organizationId,
	activeTeamId,
	authToken,
	teams
}: ActiveTeamDetailsParams): IOrganizationTeamWithMStatus | null {
	const teamsVersion = versionOf(teams);
	const ready = Boolean(activeTeamId && authToken && teams);
	const { data } = useQuery({
		queryKey: ['organization-team-details', tenantId, organizationId, activeTeamId, teamsVersion],
		queryFn: async () => {
			const signedIn = typeof authToken === 'string';
			if (!signedIn) {
				return null;
			}
			const { data: team } = await getOrganizationTeamRequest(
				{ organizationId, tenantId, teamId: activeTeamId },
				authToken
			);
			return team ?? null;
		},
		enabled: ready,
		placeholderData: keepPreviousData,
		staleTime: Infinity,
		gcTime: 0,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	});
	return data ?? null;
}
