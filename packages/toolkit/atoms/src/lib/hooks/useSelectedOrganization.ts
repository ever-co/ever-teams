import { IUser, IUserOrganization, PaginationResponse } from '@ever-teams/toolkit-types';
import { selectedOrganizationAtom } from '@lib/teams-jotai/atoms/teams-atoms';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { hostSessionAtom } from '@lib/session/host-session';
import { useKitOptions } from '@components/teams-provider/kit-options';

export const useSelectedOrganization = (
	user: IUser | null,
	userOrganizations: PaginationResponse<IUserOrganization> | null
) => {
	const [organizationId, setSelectedOrganization] = useAtom(selectedOrganizationAtom);
	const { hostSignIn } = useKitOptions();
	const hostSession = useAtomValue(hostSessionAtom);

	// The host's token names the organization (else the member's own): the kit reads no organization list then, and
	// another organization chosen later goes back to the token's.
	useEffect(() => {
		if (!hostSignIn || !user) {
			return;
		}
		const fromHost = hostSession.organizationId || user.employee?.organizationId;
		if (fromHost && fromHost !== organizationId) {
			setSelectedOrganization(fromHost);
		}
	}, [hostSignIn, user, hostSession.organizationId, organizationId]);

	useEffect(() => {
		if (hostSignIn) {
			return;
		}
		if (userOrganizations && user) {
			let selectedOrgId =
				userOrganizations.items.find((elt) => elt.isDefault)?.organizationId ||
				userOrganizations.items[0]?.organizationId;

			if (!selectedOrgId && user.employee) {
				selectedOrgId = user.employee.organizationId;
			}

			if (selectedOrgId && selectedOrgId !== organizationId) {
				setSelectedOrganization(selectedOrgId);
			}
		}
	}, [user, userOrganizations, hostSignIn]);

	return organizationId;
};
