import { IUser } from '@app/interfaces';
import {
	collaborativeMembersState,
	collaborativeSelectState,
} from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useAuthenticateUser } from './features/useAuthenticateUser';
import { useOrganizationTeams } from './features/useOrganizationTeams';

export function useCollaborative(user?: IUser) {
	const { activeTeam } = useOrganizationTeams();
	const { user: authUser } = useAuthenticateUser();
	const [collaborativeSelect, setCollaborativeSelect] = useRecoilState(
		collaborativeSelectState
	);
	const [collaborativeMembers, setCollaborativeMembers] = useRecoilState(
		collaborativeMembersState
	);

	const user_selected = useCallback(() => {
		return collaborativeMembers.some((u) => u.id === user?.id);
	}, [user, collaborativeMembers]);

	const onUserSelect = useCallback(() => {
		if (!user) return;
		const exists = user_selected();

		if (exists) {
			setCollaborativeMembers((users) => users.filter((u) => u.id !== user.id));
		} else {
			setCollaborativeMembers((users) => users.concat(user));
		}
	}, [user_selected, user, setCollaborativeMembers]);

	const getMeetRoomName = useCallback(() => {
		const teamName = activeTeam?.name;
		if (!teamName) return;

		const authName = authUser?.name || '';
		const members = collaborativeMembers.map((t) => {
			const names = t.name?.split(' ') || [];
			return (names[0] + ' ' + (names[1]?.at(0) || '').toUpperCase()).trim();
		});

		const member =
			members.length > 0
				? ' - ' + (authName ? authName + ', ' : '') + members.join(', ')
				: '';

		return teamName + member;
	}, [authUser, activeTeam, collaborativeMembers]);

	return {
		collaborativeSelect,
		setCollaborativeSelect,

		collaborativeMembers,
		setCollaborativeMembers,
		user_selected,
		onUserSelect,
		getMeetRoomName,
	};
}
