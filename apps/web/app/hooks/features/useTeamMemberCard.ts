import { IOrganizationTeamList, ITeamTask, Nullable } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useOutsideClick } from '../useOutsideClick';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useIsMemberManager } from './useTeamMember';

export function useTeamMemberCard(
	member?: IOrganizationTeamList['members'][number]
) {
	const { user: authUSer } = useAuthenticateUser();
	const activeTeamTask = useRecoilValue(activeTeamTaskState);

	const memberUser = member?.employee.user;
	const isAuthUser = member?.employee.userId === authUSer?.id;

	const { isTeamManager } = useIsMemberManager(memberUser);
	const [memberTask, setMemberTask] = useState<ITeamTask | null>(null);

	useEffect(() => {
		if (isAuthUser) {
			setMemberTask(activeTeamTask);
		}
	}, [activeTeamTask, isAuthUser]);

	return {
		isTeamManager,
		memberUser,
		memberTask,
		isAuthUser,
	};
}

export function useTMCardTaskEdit(task: Nullable<ITeamTask>) {
	const [editMode, setEditMode] = useState(false);
	const [estimateEditMode, setEstimateEditMode] = useState(false);
	const estimateEditIgnoreElement = useOutsideClick<any>();

	return {
		editMode,
		setEditMode,
		task,
		estimateEditMode,
		setEstimateEditMode,
		estimateEditIgnoreElement,
	};
}

export type I_TMCardTaskEditHook = ReturnType<typeof useTMCardTaskEdit>;

export type I_TeamMemberCardHook = ReturnType<typeof useTeamMemberCard>;
