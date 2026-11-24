import { useTeamsContext } from '@lib/context/teams-context';

/**
 * The selected organization's name, or undefined while it is unknown: signed out, or the organizations not read (yet).
 * A widget's title names no organization then, rather than one the kit does not know (#5644). Each widget picks its
 * own title, so that its translation keys stay typed.
 */
export const useSelectedOrganizationName = (): string | undefined => {
	const { userOrganizations, selectedOrganization } = useTeamsContext();
	const selected = userOrganizations?.items.find((item) => item.organizationId === selectedOrganization);
	return selected?.organization?.name || undefined;
};
