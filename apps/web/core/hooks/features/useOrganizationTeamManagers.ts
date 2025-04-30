import { useAtomValue } from 'jotai';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';
import { filterValue } from '@app/stores/all-teams';
import { useMemo } from 'react';
/**
 * Provides a hook that returns the teams managed by the authenticated user, along with the ability to filter those teams based on the timer status of their members.
 *
 * @returns An object with two properties:
 *   - `userManagedTeams`: An array of teams that the authenticated user manages.
 *   - `filteredTeams`: An array of teams that the authenticated user manages, filtered based on the `filterValue` atom.
 */
export function useOrganizationAndTeamManagers() {
	const { user } = useAuthenticateUser();
	const { teams } = useOrganizationTeams();
	const { value: filtered } = useAtomValue(filterValue);

	/**
	 * Filters the teams managed by the authenticated user.
	 *
	 * @returns An array of teams that the authenticated user manages, where the authenticated user has the 'MANAGER' role for at least one member of the team.
	 */
	const userManagedTeams = useMemo(() => {
		return (
			teams?.filter((team) =>
				team?.members?.some(
					(member) => member?.employee?.user?.id === user?.id && member?.role?.name === 'MANAGER'
				)
			) || []
		);
	}, [teams, user]);

	/**
	 * Filters the teams managed by the authenticated user based on the `filterValue` atom.
	 *
	 * @returns An array of teams that the authenticated user manages, filtered based on the `filterValue` atom. The filtering options include:
	 *   - 'all': Returns all teams managed by the authenticated user.
	 *   - 'pause': Returns teams where at least one member has a timer status of 'pause'.
	 *   - 'running': Returns teams where at least one member has a timer status of 'running'.
	 *   - 'suspended': Returns teams where at least one member has a timer status of 'suspended'.
	 *   - 'invited': Returns teams where at least one member has an `acceptDate` value.
	 */
	const filteredTeams = useMemo(() => {
		return filtered === 'all'
			? userManagedTeams
			: filtered === 'pause'
				? userManagedTeams.map((team) => ({
						...team,
						members: team.members.filter((member) => member.timerStatus === 'pause')
					}))
				: filtered === 'running'
					? userManagedTeams.map((team) => ({
							...team,
							members: team.members.filter((member) => member.timerStatus === 'running')
						}))
					: filtered === 'suspended'
						? userManagedTeams.map((team) => ({
								...team,
								members: team.members.filter((member) => member.timerStatus === 'suspended')
							}))
						: filtered === 'invited'
							? userManagedTeams.map((team) => ({
									...team,
									members: team.members.filter((member) => member.employee.acceptDate)
								}))
							: userManagedTeams;
	}, [filtered, userManagedTeams]);

	return {
		userManagedTeams,
		filteredTeams
	};
}
