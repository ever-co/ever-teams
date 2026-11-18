import { useEffect, useState } from 'react';
import { IProject, IHookResponse } from '@ever-teams/toolkit-types';
import { getOrganisationProjects } from '@ever-teams/api';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

export const useOrganizationProjects = ({ clientId }: { clientId: string | null }): IHookResponse<IProject[]> => {
	const [projects, setProjects] = useState<IHookResponse<IProject[]>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { hostSignIn, api } = useKitOptions();

	useEffect(() => {
		// A token from the host's getToken does not reach the member's projects: no read, so no refusal to show
		if (hostSignIn) {
			setProjects({ data: [], loading: false });
			return;
		}
		// A read the effect has moved past (another client, organization or address, or the widget gone) shows nothing,
		// not even its error: the toasts are the page's
		let current = true;
		if (user && organizationId) {
			(async () => {
				setProjects((prev) => ({ ...prev, loading: true }));
				const userProjects = await getOrganisationProjects(user, token, clientId, organizationId, api);
				if (!current) {
					return;
				}

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
		return () => {
			current = false;
			// The next read, if any, sets it again
			setProjects((prev) => (prev.loading ? { ...prev, loading: false } : prev));
		};
	}, [user, clientId, organizationId, hostSignIn, api]);

	return projects;
};
