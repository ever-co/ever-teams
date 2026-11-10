'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Meta } from '@/core/components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useTokenLiveKit } from '@/core/hooks/common/use-live-kit';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { readRuntimeEnv } from '@/env-config';

// Import optimized components from centralized location
import { LazyLiveKit as LiveKit, preloadLiveKit } from '@/core/components/optimized-components/meet';
import { LiveKitMeetPageSkeleton } from '../meet-room-skeleton';
import { MeetRoomError } from '../meet-room-error';

function LiveKitPage() {
	const t = useTranslations();
	const router = useRouter();
	const { user } = useAuthenticateUser();
	const [roomName, setRoomName] = useState<string | undefined>(undefined);
	const requestedRoom = useRef<string | undefined>(undefined);
	const params = useSearchParams();

	const onLeave = useCallback(() => {
		// Moving to another room unmounts the connected component, which disconnects and calls this
		// back for the room left behind. Only a disconnect from the room still requested is a leave.
		if (roomName !== requestedRoom.current) return;
		window.localStorage.removeItem('current-room-live-kit');
		router.push('/');
	}, [roomName, router]);

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

	const { token, error, retry } = useTokenLiveKit({
		roomName: roomName || ''
	});

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

	return (
		<div>
			<Meta title="Meet" />
			{!canJoin && <LiveKitMeetPageSkeleton />}
			{token && roomName && (
				<LiveKit
					token={token}
					roomName={roomName}
					liveKitUrl={readRuntimeEnv('NEXT_PUBLIC_LIVEKIT_URL') || process.env.NEXT_PUBLIC_LIVEKIT_URL || ''}
					onLeave={onLeave}
					userChoices={{
						videoEnabled: true,
						audioEnabled: true,
						audioDeviceId: '',
						username: user?.email || '',
						videoDeviceId: ''
					}}
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
