import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';

export function useOrganizationAndTeamManagers() {
	const { user } = useAuthenticateUser();
	const { teams } = useOrganizationTeams();

	const userManagedTeams = teams.filter((team) =>
		team.members.some((member) => member.employee?.user?.id === user?.id && member.role?.name === 'MANAGER')
	);

	return {
		userManagedTeams
	};
}
