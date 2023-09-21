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
import { nanoid } from 'nanoid';
import capitalize from 'lodash/capitalize';

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

	const randomMeetName = useCallback(() => nanoid(15), []);

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
		let teamName = activeTeam?.name;
		if (!teamName || !authUser) {
			return randomMeetName();
		}

		teamName = teamName
			.split(' ')
			.map((t) => capitalize(t))
			.join('');

		const members = collaborativeMembers
			.concat(authUser)
			.map((t) => {
				const names = t.name?.split(' ') || [];
				return names[0] || '';
			})
			.join('-');

		return `${teamName}-${members}-${randomMeetName()}`;
	}, [authUser, randomMeetName, activeTeam, collaborativeMembers]);

	const onMeetClick = useCallback(() => {
		const meetName = getMeetRoomName();

		url.push(`/meet?room=${btoa(meetName)}`);
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
