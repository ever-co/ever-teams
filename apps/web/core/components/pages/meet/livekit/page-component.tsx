'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Meta } from '@/core/components';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useTokenLiveKit } from '@/core/hooks/common/use-live-kit';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useMeetingRoomFlow } from '@/core/hooks/meetings/use-meeting-room-flow';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { isRoomTokenStale, roomNameOfParam } from '@/core/lib/utils/meetings';
import type { MeetingJoinChoices } from '@/core/hooks/meetings/use-media-preview';
import { readRuntimeEnv } from '@/env-config';

// Import optimized components from centralized location
import { LazyLiveKit as LiveKit, preloadLiveKit } from '@/core/components/optimized-components/meet';
import { LiveKitMeetPageSkeleton } from '../meet-room-skeleton';
import { MeetRoomError } from '../meet-room-error';
import { MeetPreJoin } from '../pre-join/meet-pre-join';
import { MeetLeft } from '../room/meet-left';

function LiveKitPage() {
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const [roomName, setRoomName] = useState<string | undefined>(undefined);
	const requestedRoom = useRef<string | undefined>(undefined);
	const params = useSearchParams();
	const flow = useMeetingRoomFlow(useMemo(() => roomNameOfParam(roomName), [roomName]));
	const { leave } = flow;

	const onLeave = useCallback(() => {
		// Moving to another room unmounts the connected component, which disconnects and calls this
		// back for the room left behind. Only a disconnect from the room still requested is a leave.
		if (roomName !== requestedRoom.current) return;
		window.localStorage.removeItem('current-room-live-kit');
		leave();
	}, [roomName, leave]);

	// LiveKit only renders once the token arrives; fetch its chunk alongside the token, not after it.
	useEffect(() => {
		preloadLiveKit();
	}, []);

	useEffect(() => {
		const room = params.get('roomName');
		if (room) {
			setRoomName(room);
			requestedRoom.current = room;
			window.localStorage.setItem('current-room-live-kit', room);
		}
	}, [params]);

	const { token, issuedAt, error, retry, refresh } = useTokenLiveKit({
		roomName: roomName || ''
	});
	// A token lasts an hour: coming back into the room asks for a new one, and the room waits for it
	const { rejoin: reopenRoom } = flow;
	const rejoin = useCallback(() => {
		refresh();
		reopenRoom();
	}, [refresh, reopenRoom]);
	// The token was fetched with the page: after a long stay on the pre-join screen, a new one opens the room
	const { join: enterRoom } = flow;
	const join = useCallback(
		(picked: MeetingJoinChoices) => {
			if (isRoomTokenStale(issuedAt, Date.now())) refresh();
			enterRoom(picked);
		},
		[enterRoom, issuedAt, refresh]
	);

	const hasToken = Boolean(token);
	const hasRoomName = Boolean(roomName);
	const canJoin = hasToken && hasRoomName;

	// A link without a room never gets a token: it says so instead of loading forever
	if (!params.get('roomName')) {
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t('collaborate.MEETING_LINK_INVALID')}
			/>
		);
	}

	if (error) {
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)}
				onRetry={retry}
			/>
		);
	}

	const displayName = user?.name || user?.email || '';

	return (
		<div>
			<Meta title={flow.title ?? t('meetings.TITLE')} />
			{flow.stage === 'prejoin' && (
				<MeetPreJoin
					title={flow.title}
					displayName={displayName}
					onJoin={join}
					onBack={flow.backToMeetings}
					shareScreenOnJoin={flow.shareScreenOnJoin}
					onCopyLink={flow.copyLink}
				/>
			)}
			{flow.stage === 'left' && <MeetLeft title={flow.title} onRejoin={rejoin} onBack={flow.backToMeetings} />}
			{flow.stage === 'room' && !canJoin && <LiveKitMeetPageSkeleton />}
			{flow.stage === 'room' && token && roomName && (
				<LiveKit
					key={flow.attempt}
					token={token}
					roomName={roomName}
					liveKitUrl={readRuntimeEnv('NEXT_PUBLIC_LIVEKIT_URL') || process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
					onLeave={onLeave}
					title={flow.title}
					shareScreenOnJoin={flow.shareScreenOnJoin}
					onCopyLink={flow.copyLink}
					userChoices={{
						videoEnabled: flow.choices?.videoEnabled ?? true,
						audioEnabled: flow.choices?.audioEnabled ?? true,
						audioDeviceId: flow.choices?.audioInputId ?? '',
						videoDeviceId: flow.choices?.videoInputId ?? '',
						username: flow.choices?.displayName || displayName
					}}
					audioOutputDeviceId={flow.choices?.audioOutputId ?? ''}
					noiseFilter={flow.choices?.noiseFilter ?? true}
					hdVideo={flow.choices?.hdVideo ?? true}
				/>
			)}
		</div>
	);
}

export default withAuthentication(LiveKitPage, {
	displayName: 'LiveKitPage',
	showPageSkeleton: false,
	skeleton: LiveKitMeetPageSkeleton
});
