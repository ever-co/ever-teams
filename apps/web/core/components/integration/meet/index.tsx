'use client';

import { MEET_DOMAIN } from '@/core/constants/config/constants';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useJitsiExternalApi } from '@/core/hooks/common/use-jitsi-external-api';
import { MeetRoomError } from '@/core/components/pages/meet/meet-room-error';
import { JitsiMeetPageSkeleton, MeetRoomSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';

interface MeetPageProps {
	jwt: string;
	roomName: string;
}

/** The part of the Jitsi Meet API instance the room uses. */
interface JitsiRoomApi {
	addListener: (event: string, listener: (...args: unknown[]) => void) => unknown;
	dispose: () => void;
}

/** What the room says when the meeting server's API could not be loaded, by reason. */
const SERVER_FAILURE_KEYS = {
	'not-configured': 'collaborate.MEETING_SERVER_NOT_CONFIGURED',
	unreachable: 'collaborate.MEETING_SERVER_UNREACHABLE',
	timeout: 'collaborate.MEETING_SERVER_TIMEOUT',
	invalid: 'collaborate.MEETING_SERVER_INVALID'
} as const;

export default function MeetPage({ jwt, roomName }: MeetPageProps) {
	const t = useTranslations();
	const router = useRouter();
	const jitsiApi = useJitsiExternalApi(MEET_DOMAIN.value);
	const [isDisconnected, setIsDisconnected] = useState(false);
	const [joinAttempt, setJoinAttempt] = useState(0);
	const roomApiRef = useRef<JitsiRoomApi | null>(null);

	// The SDK never ends its API instance: a new attempt at the room, and leaving the page, end the previous one
	useEffect(() => {
		return () => {
			roomApiRef.current?.dispose();
			roomApiRef.current = null;
		};
	}, [joinAttempt]);

	// Handle meeting close
	const handleClose = useCallback(() => {
		router.push('/');
	}, [router]);

	// Handle API ready
	const handleApiReady = useCallback(
		(externalApi: JitsiRoomApi) => {
			roomApiRef.current = externalApi;
			externalApi.addListener('readyToClose', handleClose);
			externalApi.addListener('videoConferenceLeft', handleClose);
			externalApi.addListener('connectionFailed', () => setIsDisconnected(true));
		},
		[handleClose]
	);

	const rejoin = useCallback(() => {
		setIsDisconnected(false);
		setJoinAttempt((count) => count + 1);
	}, []);

	// Handle iframe setup
	const handleIFrameRef = useCallback((parentNode: HTMLDivElement) => {
		if (parentNode) {
			parentNode.style.height = '100vh';
		}
	}, []);

	const canOpenRoom = Boolean(jwt && roomName);
	if (!canOpenRoom) {
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t('collaborate.MEETING_LINK_INVALID')}
			/>
		);
	}

	if (jitsiApi.status === 'error') {
		const { reason } = jitsiApi.error;
		// Only the app's configuration can give a missing server: trying again would change nothing
		let retry: (() => void) | undefined = jitsiApi.retry;
		if (reason === 'not-configured') {
			retry = undefined;
		}
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t(SERVER_FAILURE_KEYS[reason], { domain: jitsiApi.domain })}
				onRetry={retry}
			/>
		);
	}

	if (jitsiApi.status === 'loading') {
		return <MeetRoomSkeleton label={t('collaborate.CONNECTING_MEETING_SERVER')} />;
	}

	if (isDisconnected) {
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_DISCONNECTED')}
				description={t('collaborate.MEETING_DISCONNECTED_HINT')}
				onRetry={rejoin}
			/>
		);
	}

	return (
		<JitsiMeeting
			key={joinAttempt}
			domain={jitsiApi.domain}
			roomName={roomName}
			configOverwrite={{
				startWithAudioMuted: true,
				startWithVideoMuted: true,
				disableModeratorIndicator: false,
				startScreenSharing: false,
				enableEmailInStats: false,
				preJoinPageEnabled: true,
				enableClosePage: true
			}}
			interfaceConfigOverwrite={{
				DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
				MOBILE_APP_PROMO: false,
				SHOW_CHROME_EXTENSION_BANNER: false
			}}
			jwt={jwt}
			spinner={JitsiMeetPageSkeleton}
			onApiReady={handleApiReady}
			getIFrameRef={handleIFrameRef}
		/>
	);
}
