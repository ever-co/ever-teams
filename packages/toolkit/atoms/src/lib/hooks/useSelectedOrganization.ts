import { IUser, IUserOrganization, PaginationResponse } from '@ever-teams/toolkit-types';
import { selectedOrganizationAtom } from '@lib/teams-jotai/atoms/teams-atoms';
import { useAtom } from 'jotai';
import { useEffect } from 'react';

export const useSelectedOrganization = (
	user: IUser | null,
	userOrganizations: PaginationResponse<IUserOrganization> | null
) => {
	const [organizationId, setSelectedOrganization] = useAtom(selectedOrganizationAtom);

	useEffect(() => {
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
	}, [user, userOrganizations]);

	return organizationId;
};
