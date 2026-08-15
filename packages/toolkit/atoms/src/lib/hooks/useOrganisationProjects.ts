import { useEffect, useState } from 'react';
import { IProject, IHookResponse } from '@ever-teams/toolkit-types';
import { getOrganisationProjects } from '@ever-teams/api';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';

export const useOrganizationProjects = ({ clientId }: { clientId: string | null }): IHookResponse<IProject[]> => {
	const [projects, setProjects] = useState<IHookResponse<IProject[]>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();

	useEffect(() => {
		if (user && organizationId) {
			(async () => {
				setProjects((prev) => ({ ...prev, loading: true }));
				const userProjects = await getOrganisationProjects(user, token, clientId, organizationId);

				if ('message' in userProjects || 'error' in userProjects) {
					const errorMessage =
						'message' in userProjects
							? Array.isArray(userProjects.message)
								? userProjects.message.join(', ')
								: userProjects.message
							: String(userProjects.error);

					toast({
						variant: 'destructive',
						description: errorMessage
					});
					setProjects((prev) => ({ ...prev, loading: false }));

					return;
				}

				setProjects({ data: userProjects, loading: false });
			})();
		}
	}, [user, clientId, organizationId]);

	return projects;
};
