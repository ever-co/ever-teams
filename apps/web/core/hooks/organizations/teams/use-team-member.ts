'use client';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { activeTeamState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TUser } from '@/core/types/schemas';

export function useIsMemberManager(user?: TUser | null) {
	const activeTeam = useAtomValue(activeTeamState);

	const activeManager = useMemo(() => {
		if (!user || !activeTeam?.members) return undefined;

		return activeTeam.members.find((member) => {
			const isUser = member.employee?.userId === user.id;
			const roleName = member.role?.name;
			return (
				isUser &&
				(roleName === ERoleName.MANAGER || roleName === ERoleName.SUPER_ADMIN || roleName === ERoleName.ADMIN)
			);
		});
	}, [user?.id, activeTeam?.members]);

	const isTeamCreator = useMemo(() => {
		if (!user || !activeTeam?.createdByUserId) return false;
		return activeTeam.createdByUserId === user.id;
	}, [user?.id, activeTeam?.createdByUserId]);

	// Team creator should automatically be considered a manager (business logic fix)
	const isTeamManager = !!activeManager || isTeamCreator;
	return {
		isTeamManager,
		isTeamCreator,
		activeTeam,
		activeManager
	};
}
