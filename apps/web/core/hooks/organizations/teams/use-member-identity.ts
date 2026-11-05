'use client';
import { activeTeamCreatorUserIdState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useTeamManagerRole } from './use-team-member';
import { TOrganizationTeamEmployee, TUser } from '@/core/types/schemas';
import { useUserQuery } from '../../queries/user-user.query';

/**
 * Resolves identity and role information for a given team member.
 *
 * Provides cheap, lightweight identity checks without subscribing to
 * task state, statistics, or other heavy atoms. It reads the team's managers and creator, never the whole team, so a
 * member row does not re-render on every team refresh.
 *
 * @param member - The team member to resolve identity for
 * @returns Identity and role flags for the member
 */
export function useMemberIdentity(member: TOrganizationTeamEmployee | undefined) {
	const { data: authUser } = useUserQuery();

	const { isTeamManager: isAuthTeamManager } = useTeamManagerRole(authUser?.id);
	const teamCreatorUserId = useAtomValue(activeTeamCreatorUserIdState);

	const memberUser: TUser | undefined = member?.employee?.user;
	const isAuthUser = !!member?.employee?.userId && member.employee.userId === authUser?.id;

	const { isTeamManager, isTeamCreator } = useTeamManagerRole(memberUser?.id);

	const isTeamOwner = teamCreatorUserId === memberUser?.id;

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
