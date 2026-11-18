import { useEffect, useState } from 'react';
import { PaginationResponse, IOrganizationTeamList, IHookResponse } from '@ever-teams/toolkit-types';
import { getOrganisationTeams } from '@ever-teams/api';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

export const useOrganizationTeams = ({
	projectId
}: {
	projectId: string | null;
}): IHookResponse<PaginationResponse<IOrganizationTeamList>> => {
	const [teams, setTeams] = useState<IHookResponse<PaginationResponse<IOrganizationTeamList>>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	// A token from the host's getToken reads only the member's teams, as the API allows it
	const { hostSignIn: embedded } = useKitOptions();

	useEffect(() => {
		if (user && organizationId) {
			(async () => {
				setTeams((prev) => ({ ...prev, loading: true }));

				const userTeams = await getOrganisationTeams({ user, token, organizationId, projectId, embedded });

				if ('message' in userTeams || 'error' in userTeams) {
					const errorMessage =
						'message' in userTeams
							? Array.isArray(userTeams.message)
								? userTeams.message.join(', ')
								: userTeams.message
							: String(userTeams.error);

					setTeams((prev) => ({ ...prev, loading: false }));

					toast({
						description: errorMessage,
						variant: 'destructive'
					});
					return;
				}
				setTeams({ data: userTeams, loading: false });
			})();
		}
	}, [user, projectId, organizationId, embedded]);

	return teams;
};
