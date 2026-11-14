'use client';

import { useQuery } from '@tanstack/react-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { isTenantAdminRole } from '@/core/lib/utils/roles';
import { queryKeys } from '@/core/query/keys';
import { teamMenuOrganizationsService } from '@/core/services/client/api/organizations/teams/team-menu-organizations.service';

/**
 * The person's organizations of the workspace for the team menu (ever-co/ever-teams#5204): the current one, and the
 * others with their teams for a workspace admin. Read once per session scope and kept for ten minutes, so the menu
 * opens on it at once.
 */
export function useTeamMenuOrganizations() {
	const { data: user } = useUserQuery();
	const accessToken = useReactiveAccessTokenCookie();
	const tenantId = user?.employee?.tenantId ?? user?.tenantId ?? null;
	const organizationId = user?.employee?.organizationId ?? getOrganizationIdCookie() ?? null;
	const userId = user?.id ?? null;
	const listsTeams = isTenantAdminRole(user?.role?.name);
	const isReady = Boolean(tenantId && organizationId && userId && accessToken);

	return useQuery({
		queryKey: queryKeys.organizationTeams.menuOrganizations(tenantId, organizationId, userId),
		queryFn: ({ signal }) =>
			teamMenuOrganizationsService.getTeamMenuOrganizations({
				scope: { tenantId, organizationId, userId, accessToken },
				signal,
				listsTeams
			}),
		enabled: isReady,
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: false,
		retry: 1
	});
}
