import { useEffect, useState } from 'react';
import { IHookResponse, IOrganizationContact } from '@ever-teams/toolkit-types';
import { getOrganizationClients } from '@ever-teams/api';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

export const useEmployeeOrganization = (): IHookResponse<IOrganizationContact[]> => {
	const [clients, setClients] = useState<IHookResponse<IOrganizationContact[]>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { hostSignIn, api } = useKitOptions();

	useEffect(() => {
		// A token from the host's getToken does not reach the clients: no read, so no refusal to show
		if (hostSignIn) {
			setClients({ data: [], loading: false });
			return;
		}
		// A read the effect has moved past (another person, organization or address, or the widget gone) shows nothing,
		// not even its error: the toasts are the page's
		let current = true;
		if (user && organizationId) {
			(async () => {
				setClients((prev) => ({ ...prev, loading: true }));
				const userClients = await getOrganizationClients(user, token, organizationId, api);
				if (!current) {
					return;
				}

				if ('message' in userClients || 'error' in userClients) {
					const errorMessage =
						'message' in userClients
							? Array.isArray(userClients.message)
								? userClients.message.join(', ')
								: userClients.message
							: String(userClients.error);

					toast({
						variant: 'destructive',
						description: errorMessage
					});
					setClients((prev) => ({ ...prev, loading: false }));

					return;
				}

				setClients({ data: userClients, loading: false });
			})();
		} else {
			setClients({ data: [], loading: false });
		}
		return () => {
			current = false;
			// The next read, if any, sets it again
			setClients((prev) => (prev.loading ? { ...prev, loading: false } : prev));
		};
	}, [user, token, organizationId, hostSignIn, api]);

	return clients;
};
