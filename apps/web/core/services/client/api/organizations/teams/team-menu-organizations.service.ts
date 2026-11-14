import { APIService, getFallbackAPI } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { ScopedReadOptions } from '@/core/services/client/api-request-scope';
import { userOrganizationService } from '@/core/services/client/api/users/user-organization.service';
import { readTeamMenuOrganizations, type ITeamMenuOrganizations } from '@/core/lib/utils/team-menu-organizations';
import { organizationTeamService } from './team.service';

/** The app route that answers the same thing in proxy mode (`app/api/organization-team/organizations`). */
export const TEAM_MENU_ORGANIZATIONS_ROUTE = '/organization-team/organizations';

class TeamMenuOrganizationsService extends APIService {
	/**
	 * The person's organizations of the workspace for the team menu: the current one, and the others with their teams
	 * when `listsTeams` (the workspace's admins, whom Gauzy lets read every organization). In proxy mode the app's route
	 * reads the same thing with the session it holds.
	 */
	getTeamMenuOrganizations = async ({
		scope,
		signal,
		listsTeams
	}: ScopedReadOptions & { listsTeams: boolean }): Promise<ITeamMenuOrganizations> => {
		if (!GAUZY_API_BASE_SERVER_URL.value) {
			const api = await getFallbackAPI();
			const { data } = await api.get<ITeamMenuOrganizations>(TEAM_MENU_ORGANIZATIONS_ROUTE, { signal });
			return data;
		}

		const tenantId = scope.tenantId ?? '';
		const userId = scope.userId ?? '';
		const token = scope.accessToken ?? '';
		const { data: memberships } = await userOrganizationService.getUserOrganizations({ tenantId, userId, token });

		return readTeamMenuOrganizations({
			memberships: memberships.items ?? [],
			currentOrganizationId: scope.organizationId,
			listsTeams,
			readTeams: async (organizationId) => {
				const { data } = await organizationTeamService.getOrganizationTeams({
					scope: { ...scope, organizationId },
					signal
				});
				return data.items ?? [];
			}
		});
	};
}

export const teamMenuOrganizationsService = new TeamMenuOrganizationsService(GAUZY_API_BASE_SERVER_URL.value);
