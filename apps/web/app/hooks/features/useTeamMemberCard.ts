import { IOrganizationTeamList, ITeamTask } from '@app/interfaces';
import { activeTeamTaskState } from '@app/stores';
import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
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
