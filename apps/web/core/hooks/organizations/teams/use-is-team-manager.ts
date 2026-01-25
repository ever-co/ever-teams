'use client';

import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMemo } from 'react';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';

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
