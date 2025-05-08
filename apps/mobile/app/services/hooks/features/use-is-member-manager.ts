/* eslint-disable camelcase */
import { useEffect, useState } from 'react';
import { useStores } from '../../../models';
import { IUser } from '../../api';
import { OT_Member } from '../../interfaces/IOrganizationTeam';

export function useIsMemberManager(user: IUser | undefined | null) {
	const [isTeamManager, setTeamManager] = useState(false);
	const [isTeamCreator, setTeamCreator] = useState(false);
	const [activeManager, setActiveManager] = useState<OT_Member>();

	const {
		teamStore: { activeTeam }
	} = useStores();

	useEffect(() => {
		if (activeTeam && user) {
			// Team manager
			const isM = activeTeam?.members?.find((member) => {
				const isUser = member.employee.userId === user?.id;
				return isUser && member.role && member.role.name === 'MANAGER';
			});
			setActiveManager(isM);
			setTeamManager(!!isM);

			// Team creator
			setTeamCreator(activeTeam.createdById === user.id);
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
