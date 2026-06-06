import { useEffect, useState } from 'react';
import { IHookResponse, IOrganizationContact } from '@ever-teams/toolkit-types';
import { getOrganizationClients } from '@ever-teams/api';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';

export const useEmployeeOrganization = (): IHookResponse<IOrganizationContact[]> => {
	const [clients, setClients] = useState<IHookResponse<IOrganizationContact[]>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();

	useEffect(() => {
		if (user && organizationId) {
			(async () => {
				setClients((prev) => ({ ...prev, loading: true }));
				const userClients = await getOrganizationClients(user, token, organizationId);

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
	}, [user, token, organizationId]);

	return clients;
};
