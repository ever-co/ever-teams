import { IOrganizationTeamList, ITeamTask, Nullable } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useOutsideClick } from '../useOutsideClick';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useIsMemberManager } from './useTeamMember';

export function useTeamMemberCard(
	member: IOrganizationTeamList['members'][number] | undefined
) {
	const { user: authUSer, isTeamManager: isAuthTeamManager } =
		useAuthenticateUser();
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

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

	return {
		isTeamManager,
		memberUser,
		member,
		memberTask,
		isAuthUser,
		isAuthTeamManager,
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
