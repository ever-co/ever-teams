'use client';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMemo } from 'react';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';

/**
 * Hook to determine if the current user is a manager of the active team.
 *
 * @description
 * Checks if the authenticated user has the 'MANAGER' role within the
 * currently active organization team's members list.
 *
 * @example
 * ```tsx
 * const isManager = useIsTeamManager();
 *
 * return isManager ? <ManagerDashboard /> : <MemberView />;
 * ```
 *
 * @see {@link useGetOrganizationTeamQuery} - Provides active team data
 * @see {@link useUserQuery} - Provides current user data
 *
 * @returns `true` if user is a team manager, `false` otherwise
 */
export const useIsTeamManager = () => {
	const { data: user } = useUserQuery();
	const { data: activeTeam } = useGetOrganizationTeamQuery();

	const isTeamManager = useMemo(() => {
		const members = activeTeam?.data?.members || [];
		return members.some((member) => {
			const $u = user;
			const isUser = member.employee?.userId === $u?.id;
			return isUser && member.role && member.role.name === 'MANAGER';
		});
	}, [user, activeTeam?.data?.members]);

	return isTeamManager;
};
