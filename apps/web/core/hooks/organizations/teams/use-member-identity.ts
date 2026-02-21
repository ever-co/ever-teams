'use client';
import { activeTeamState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useIsMemberManager } from './use-team-member';
import { TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { useUserQuery } from '../../queries/user-user.query';

/**
 * Resolves identity and role information for a given team member.
 *
 * Provides cheap, lightweight identity checks without subscribing to
 * task state, statistics, or other heavy atoms.
 *
 * @param member - The team member to resolve identity for
 * @returns Identity and role flags for the member
 */
export function useMemberIdentity(member: TOrganizationTeamEmployee | undefined) {
	const { data: authUser } = useUserQuery();

	const { isTeamManager: isAuthTeamManager } = useIsMemberManager(authUser);
	const activeTeam = useAtomValue(activeTeamState);

	const memberUser: TUser | undefined = member?.employee?.user;
	const isAuthUser = member?.employee?.userId === authUser?.id;

	const { isTeamManager, isTeamCreator } = useIsMemberManager(memberUser);

	const isTeamOwner = activeTeam?.createdByUser?.id === memberUser?.id;

	return {
		memberUser,
		isAuthUser,
		isAuthTeamManager,
		isTeamManager,
		isTeamCreator,
		isTeamOwner,
		member
	};
}

export type I_MemberIdentityHook = ReturnType<typeof useMemberIdentity>;
