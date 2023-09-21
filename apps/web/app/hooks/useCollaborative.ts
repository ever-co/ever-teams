import { IUser } from '@app/interfaces';
import {
	collaborativeMembersState,
	collaborativeSelectState,
} from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useAuthenticateUser } from './features/useAuthenticateUser';
import { useOrganizationTeams } from './features/useOrganizationTeams';
import { BOARD_APP_DOMAIN } from '@app/constants';
import { useRouter } from 'next/router';
import { generateRandomString } from '@app/helpers';

export function useCollaborative(user?: IUser) {
	const { activeTeam } = useOrganizationTeams();
	const { user: authUser } = useAuthenticateUser();
	const [collaborativeSelect, setCollaborativeSelect] = useRecoilState(
		collaborativeSelectState
	);
	const [collaborativeMembers, setCollaborativeMembers] = useRecoilState(
		collaborativeMembersState
	);

	const url = useRouter();

	const randomMeetName = useCallback(() => generateRandomString(15), []);

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
		if (!teamName) {
			return randomMeetName();
		}

		const authName = authUser?.name;
		const members = collaborativeMembers.map((t) => {
			const names = t.name?.split(' ') || [];
			return (names[0] + ' ' + (names[1]?.at(0) || '').toUpperCase()).trim();
		});
		let members_str = '';

		if (members.length > 0) {
			members_str =
				' - ' + (authName ? authName + ', ' : '') + members.join(', ');
		}

		return members.length > 0 ? teamName + members_str : randomMeetName();
	}, [authUser, randomMeetName, activeTeam, collaborativeMembers]);

	const onMeetClick = useCallback(() => {
		const url_encoded = getMeetRoomName();
		url_encoded
			? url.push(`/meet?room=${btoa(url_encoded)}`)
			: url.push('/meet');
	}, [getMeetRoomName, url]);

	const onBoardClick = useCallback(() => {
		const members = collaborativeMembers.map((m) => m.id).join(',');

		if (collaborativeMembers.length > 0 && BOARD_APP_DOMAIN) {
			const url = new URL(BOARD_APP_DOMAIN);
			url.searchParams.set('live', 'true');
			url.searchParams.set('members', btoa(members));

			window.open(url.toString(), '_blank', 'noreferrer');
			return;
		}

		url.push('/board');
	}, [collaborativeMembers]);

	return {
		collaborativeSelect,
		setCollaborativeSelect,
		onBoardClick,
		onMeetClick,
		collaborativeMembers,
		setCollaborativeMembers,
		user_selected,
		onUserSelect,
		getMeetRoomName,
		randomMeetName,
	};
}
