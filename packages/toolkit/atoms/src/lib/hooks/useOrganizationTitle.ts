import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';

interface IOrganizationTitleKeys {
	keyPrefix: string;
	/** The title that names the organization, through `{{orgName}}`. */
	named: string;
	/** The title for when no organization is known: signed out, or the organizations not read (yet). */
	unnamed: string;
}

/**
 * A widget's title with the selected organization's name, or without a name while it is unknown: the kit never names
 * an organization it does not know (#5644).
 */
export const useOrganizationTitle = ({ keyPrefix, named, unnamed }: IOrganizationTitleKeys): string => {
	const { t } = useTranslation(undefined, { keyPrefix });
	const { userOrganizations, selectedOrganization } = useTeamsContext();
	const selected = userOrganizations?.items.find((item) => item.organizationId === selectedOrganization);
	const orgName = selected?.organization?.name;
	if (!orgName) {
		return t(unnamed);
	}
	return t(named, { orgName });
};
