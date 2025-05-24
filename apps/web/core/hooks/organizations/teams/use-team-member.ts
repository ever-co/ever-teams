'use client';

import { IUser, IOrganizationTeamMember, RoleNameEnum } from '@/core/types/interfaces/to-review';
import { activeTeamState } from '@/core/stores';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';

export function useIsMemberManager(user: IUser | undefined | null) {
	const [isTeamManager, setTeamManager] = useState(false);
	const [isTeamCreator, setTeamCreator] = useState(false);
	const [activeManager, setActiveManager] = useState<IOrganizationTeamMember>();
	const activeTeam = useAtomValue(activeTeamState);

	useEffect(() => {
		if (activeTeam && user) {
			// Team manager
			const isM = activeTeam?.members?.find((member) => {
				const isUser = member.employee.userId === user?.id;

				return (
					isUser &&
					member.role &&
					(member.role.name === RoleNameEnum.MANAGER ||
						member.role.name === RoleNameEnum.SUPER_ADMIN ||
						member.role.name === RoleNameEnum.ADMIN)
				);
			});
			setActiveManager(isM);
			setTeamManager(!!isM);

			// Team creatoe
			setTeamCreator(activeTeam.createdByUserId === user.id);
		} else {
			setTeamManager(false);
			setTeamCreator(false);
		}
	}, [activeTeam, user]);

	return {
		isTeamManager,
		isTeamCreator,
		activeTeam,
		activeManager
	};
}
