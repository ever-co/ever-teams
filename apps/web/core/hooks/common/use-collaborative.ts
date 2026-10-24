import { activeTeamState, collaborativeMembersState, collaborativeSelectState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { BOARD_APP_DOMAIN } from '@/core/constants/config/constants';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import capitalize from 'lodash/capitalize';
import { TUser } from '@/core/types/schemas';
import { useUserQuery } from '../queries/user-user.query';
import { readRuntimeEnv } from '@/env-config';
import { preloadLiveKit } from '@/core/components/optimized-components/meet';

export function useCollaborative(user?: TUser) {
	// Runtime (container) env first, so a published Docker image can switch to LiveKit without a rebuild.
	const meetType = readRuntimeEnv('NEXT_PUBLIC_MEET_TYPE') || process.env.NEXT_PUBLIC_MEET_TYPE || 'Jitsi';
	// Case-insensitive: deployments commonly write 'jitsi' (e.g. the docker-compose defaults), which the
	// published image used to ignore (it baked the value at build time) but now honours at runtime.
	const isJitsi = meetType.toLowerCase() === 'jitsi';

	const activeTeam = useAtomValue(activeTeamState);
	const { data: authUser } = useUserQuery();
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
			.map((t: string) => capitalize(t))
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
		const path = isJitsi ? `/meet/jitsi?room=${encodedName}` : `/meet/livekit?roomName=${encodedName}`;
		router.push(path);
	}, [getMeetRoomName, router, isJitsi]);

	// Called when the user is about to start a meeting, so the LiveKit room does not wait for its chunk.
	const preloadMeet = useCallback(() => {
		if (!isJitsi) preloadLiveKit();
	}, [isJitsi]);

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
		preloadMeet,
		collaborativeMembers,
		setCollaborativeMembers,
		user_selected,
		onUserSelect,
		getMeetRoomName,
		randomMeetName
	};
}
