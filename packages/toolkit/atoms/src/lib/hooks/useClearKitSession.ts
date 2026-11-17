import { useSetAtom } from 'jotai';
import {
	accessTokenAtom,
	selectedEmployeeAtom,
	selectedOrganizationAtom,
	selectedTeamAtom,
	userAtom,
	userOrganizationsAtom,
	userPermissionsAtom
} from '../teams-jotai/atoms/teams-atoms';

/**
 * Forgets the signed-in account inside the kit: its token, user, permissions and organizations, and the organization,
 * team and employee picked for it, back to their first values. A sign-out that keeps the page (scopedStyles or
 * onSignOut) needs all of them cleared: the next account's requests would otherwise carry the previous one's team.
 */
export function useClearKitSession(): () => void {
	const setToken = useSetAtom(accessTokenAtom);
	const setUser = useSetAtom(userAtom);
	const setPermissions = useSetAtom(userPermissionsAtom);
	const setOrganizations = useSetAtom(userOrganizationsAtom);
	const setSelectedOrganization = useSetAtom(selectedOrganizationAtom);
	const setSelectedTeam = useSetAtom(selectedTeamAtom);
	const setSelectedEmployee = useSetAtom(selectedEmployeeAtom);

	return () => {
		setToken('');
		setUser({ data: null, loading: false });
		setPermissions({ data: null, loading: false });
		setOrganizations({ data: null, loading: false });
		setSelectedOrganization('');
		setSelectedTeam('all');
		setSelectedEmployee('all');
	};
}
