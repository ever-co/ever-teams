import { IOrganizationTeamList, ITeamTask, Nullable } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useOutsideClick } from '../useOutsideClick';
import { useSyncRef } from '../useSyncRef';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';
import { useIsMemberManager } from './useTeamMember';

/**
 * It returns a bunch of data about a team member, including whether or not the user is the team
 * manager, whether or not the user is the authenticated user, and the last task the user worked on
 * @param {IOrganizationTeamList['members'][number] | undefined} member -
 * IOrganizationTeamList['members'][number] | undefined
 */
export function useTeamMemberCard(
	member: IOrganizationTeamList['members'][number] | undefined
) {
	const { user: authUSer, isTeamManager: isAuthTeamManager } =
		useAuthenticateUser();
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

	const { activeTeam, updateOrganizationTeam, updateOTeamLoading } =
		useOrganizationTeams();
	const activeTeamRef = useSyncRef(activeTeam);

	const memberUser = member?.employee.user;
	const isAuthUser = member?.employee.userId === authUSer?.id;
	const { isTeamManager } = useIsMemberManager(memberUser);
	const [memberTask, setMemberTask] = useState<ITeamTask | null>(
		member?.lastWorkedTask || null
	);

	useEffect(() => {
		if (authUSer && member) {
			if (isAuthUser) {
				setMemberTask(activeTeamTask);
			}
		}
	}, [activeTeamTask, isAuthUser, authUSer, member]);

	const makeMemberManager = useCallback(() => {
		if (!activeTeamRef.current || !memberUser?.employee.id) return;
		const team = activeTeamRef.current;

		updateOrganizationTeam(activeTeamRef.current, {
			managerIds: team.members
				.filter((r) => r.role && r.role.name === 'MANAGER')
				.map((r) => r.id)
				.concat(memberUser?.employee.id),
		});
	}, [updateOrganizationTeam, memberUser, activeTeamRef]);

	return {
		isTeamManager,
		memberUser,
		member,
		memberTask,
		isAuthUser,
		isAuthTeamManager,
		makeMemberManager,
		updateOTeamLoading,
	};
}

export function useTMCardTaskEdit(task: Nullable<ITeamTask>) {
	const [editMode, setEditMode] = useState(false);
	const [estimateEditMode, setEstimateEditMode] = useState(false);
	const [loading, setLoading] = useState(false);

	const estimateEditIgnoreElement = useOutsideClick<any>();
	const taskEditIgnoreElement = useOutsideClick<any>();

	return {
		editMode,
		setEditMode,
		task,
		estimateEditMode,
		setEstimateEditMode,
		estimateEditIgnoreElement,
		taskEditIgnoreElement,
		loading,
		setLoading,
	};
}

export type I_TMCardTaskEditHook = ReturnType<typeof useTMCardTaskEdit>;

export type I_TeamMemberCardHook = ReturnType<typeof useTeamMemberCard>;
