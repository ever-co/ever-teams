'use client';
import { activeTeamState } from '@/core/stores';
import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';

import { ERoleName } from '@/core/types/generics/enums/role';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/organization-team-employee';
import { TUser } from '@/core/types/schemas';

export function useIsMemberManager(user?: TUser | null) {
	const [isTeamManager, setTeamManager] = useState(false);
	const [isTeamCreator, setTeamCreator] = useState(false);
	const [activeManager, setActiveManager] = useState<IOrganizationTeamEmployee>();
	const activeTeam = useAtomValue(activeTeamState);

	useEffect(() => {
		if (activeTeam && user) {
			// Team manager
			const isM = activeTeam?.members?.find((member: IOrganizationTeamEmployee) => {
				const isUser = member.employee?.userId === user?.id;

				return (
					isUser &&
					member.role &&
					(member.role.name === ERoleName.MANAGER ||
						member.role.name === ERoleName.SUPER_ADMIN ||
						member.role.name === ERoleName.ADMIN)
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
