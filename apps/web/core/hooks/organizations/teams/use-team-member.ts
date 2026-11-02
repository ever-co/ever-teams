'use client';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';

import {
	activeTeamCreatedByUserIdState,
	activeTeamManagersState,
	activeTeamState,
	findTeamManagerOfUser,
	isTeamCreatorUser
} from '@/core/stores';
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
				(member.isManager === true ||
					roleName === ERoleName.MANAGER ||
					roleName === ERoleName.SUPER_ADMIN ||
					roleName === ERoleName.ADMIN)
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

/**
 * The same answer as useIsMemberManager, as booleans read from the manager list and the creator id: a component
 * rendered once per member re-renders when this user's role changes, not on every refresh of the team.
 */
export function useTeamManagerRole(userId: string | undefined) {
	const isManagerAtom = useMemo(
		() => selectAtom(activeTeamManagersState, (managers) => Boolean(findTeamManagerOfUser(managers, userId))),
		[userId]
	);
	const isManager = useAtomValue(isManagerAtom);
	const createdByUserId = useAtomValue(activeTeamCreatedByUserIdState);
	const isTeamCreator = isTeamCreatorUser(createdByUserId, userId);
	// Team creator should automatically be considered a manager (business logic fix)
	const isTeamManager = isManager || isTeamCreator;

	return {
		isTeamManager,
		isTeamCreator
	};
}

/** Whether a manager of the active team has this user on its employee (`member.employee?.user?.id`). */
export function useIsListedTeamManager(userId: string | undefined) {
	const isListedAtom = useMemo(
		() =>
			selectAtom(activeTeamManagersState, (managers) =>
				managers.some((member) => member.employee?.user?.id === userId)
			),
		[userId]
	);
	return useAtomValue(isListedAtom);
}
