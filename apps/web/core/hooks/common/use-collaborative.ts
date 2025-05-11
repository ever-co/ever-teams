import { IUser } from '@/core/types/interfaces';
import { collaborativeMembersState, collaborativeSelectState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { BOARD_APP_DOMAIN } from '@/core/constants/config/constants';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import capitalize from 'lodash/capitalize';
import { useOrganizationTeams } from '../organizations';
import { useAuthenticateUser } from '../auth';

export function useCollaborative(user?: IUser) {
	const meetType = process.env.NEXT_PUBLIC_MEET_TYPE || 'Jitsi';

	const { activeTeam } = useOrganizationTeams();
	const { user: authUser } = useAuthenticateUser();
	const [collaborativeSelect, setCollaborativeSelect] = useAtom(collaborativeSelectState);
	const [collaborativeMembers, setCollaborativeMembers] = useAtom(collaborativeMembersState);

	const router = useRouter();

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
		// LiveKit | Jitsi
		const meetName = getMeetRoomName();
		const encodedName = Buffer.from(meetName).toString('base64');
		const path = meetType === 'Jitsi' ? `/meet/jitsi?room=${encodedName}` : `/meet/livekit?roomName=${encodedName}`;
		router.push(path);
	}, [getMeetRoomName, router, meetType]);

	const onBoardClick = useCallback(() => {
		const members = collaborativeMembers.map((m) => m.id).join(',');

		if (collaborativeMembers.length > 0 && BOARD_APP_DOMAIN.value) {
			const url = new URL(BOARD_APP_DOMAIN.value);
			url.searchParams.set('live', 'true');
			url.searchParams.set('members', btoa(members));

			window.open(url.toString(), '_blank', 'noreferrer');
			return;
		}

		router.push('/board');
	}, [collaborativeMembers, router]);

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
		randomMeetName
	};
}
