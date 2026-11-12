'use client';

import { MEET_DOMAIN } from '@/core/constants/config/constants';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { useJitsiExternalApi } from '@/core/hooks/common/use-jitsi-external-api';
import { useCallbackRef } from '@/core/hooks/common/use-callback-ref';
import type { MeetingJoinChoices } from '@/core/hooks/meetings/use-media-preview';
import { MeetRoomError } from '@/core/components/pages/meet/meet-room-error';
import { JitsiMeetPageSkeleton, MeetRoomSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';
import { MeetRoomBar } from '@/core/components/pages/meet/room/meet-room-bar';

interface MeetPageProps {
	jwt: string;
	roomName: string;
	/** What the room's bar calls the meeting; null for a room with a random name. */
	title?: string | null;
	/** What the person picked before joining; without it the room starts muted, as it always did. */
	choices?: MeetingJoinChoices | null;
	/** The meeting was started to show the screen: sharing starts as soon as the room is joined. */
	shareScreenOnJoin?: boolean;
	/** The person left the room, from the bar or from Jitsi's own hang-up button. */
	onLeft: () => void;
	onCopyLink: () => void;
	/**
	 * The room lost its connection and the person tries again: the page asks for a new token when the one in hand may
	 * have expired (they last an hour, and Jitsi checks them on joining).
	 */
	onReconnect?: () => void;
}

/** The part of the Jitsi Meet API instance the room uses. */
interface JitsiRoomApi {
	addListener: (event: string, listener: (...args: unknown[]) => void) => unknown;
	executeCommand: (command: string, ...args: unknown[]) => void;
	getNumberOfParticipants: () => number;
	dispose: () => void;
}

/** What the room says when the meeting server's API could not be loaded, by reason. */
const SERVER_FAILURE_KEYS = {
	'not-configured': 'collaborate.MEETING_SERVER_NOT_CONFIGURED',
	unreachable: 'collaborate.MEETING_SERVER_UNREACHABLE',
	timeout: 'collaborate.MEETING_SERVER_TIMEOUT',
	invalid: 'collaborate.MEETING_SERVER_INVALID'
} as const;

type JitsiDevices = NonNullable<ComponentProps<typeof JitsiMeeting>['devices']>;

/**
 * Jitsi picks devices by their names; the system's default device has none to give, so its key stays out (the SDK
 * types every key as required, yet passes on only the ones given).
 */
function jitsiDevicesOf(choices: MeetingJoinChoices | null | undefined): JitsiDevices {
	const devices: Partial<JitsiDevices> = {};
	if (choices?.audioInputLabel) devices.audioInput = choices.audioInputLabel;
	if (choices?.audioOutputLabel) devices.audioOutput = choices.audioOutputLabel;
	if (choices?.videoInputLabel) devices.videoInput = choices.videoInputLabel;
	return devices as JitsiDevices;
}

export default function MeetPage({
	jwt,
	roomName,
	title = null,
	choices,
	shareScreenOnJoin = false,
	onLeft,
	onCopyLink,
	onReconnect
}: Readonly<MeetPageProps>) {
	const t = useTranslations();
	const jitsiApi = useJitsiExternalApi(MEET_DOMAIN.value);
	const [isDisconnected, setIsDisconnected] = useState(false);
	const [joinAttempt, setJoinAttempt] = useState(0);
	const [joinedAt, setJoinedAt] = useState<number | null>(null);
	const [participantCount, setParticipantCount] = useState<number | null>(null);
	// Sharing was asked of the room and has not begun: the browser may be asking which screen, or may have refused
	const [isSharePending, setIsSharePending] = useState(false);
	const hasAskedToShare = useRef(false);
	const roomApiRef = useRef<JitsiRoomApi | null>(null);
	const onLeftRef = useCallbackRef(onLeft);
	const onReconnectRef = useCallbackRef(onReconnect);

	// The SDK never ends its API instance: a new attempt at the room, and leaving the page, end the previous one
	useEffect(() => {
		return () => {
			roomApiRef.current?.dispose();
			roomApiRef.current = null;
		};
	}, [joinAttempt]);

	const handleApiReady = useCallback(
		(externalApi: JitsiRoomApi) => {
			roomApiRef.current = externalApi;
			const countParticipants = () => setParticipantCount(externalApi.getNumberOfParticipants());
			externalApi.addListener('videoConferenceJoined', () => {
				setJoinedAt(Date.now());
				countParticipants();
				// Once a meeting, not again on coming back after a lost connection
				if (shareScreenOnJoin && !hasAskedToShare.current) {
					hasAskedToShare.current = true;
					setIsSharePending(true);
					externalApi.executeCommand('toggleShareScreen');
				}
			});
			externalApi.addListener('screenSharingStatusChanged', (status) => {
				if ((status as { on?: boolean } | undefined)?.on) setIsSharePending(false);
			});
			externalApi.addListener('participantJoined', countParticipants);
			externalApi.addListener('participantLeft', countParticipants);
			// Jitsi's own hang-up button, or the room ending: the page says the person left, with a way back in
			externalApi.addListener('readyToClose', () => onLeftRef.current());
			externalApi.addListener('videoConferenceLeft', () => onLeftRef.current());
			externalApi.addListener('connectionFailed', () => setIsDisconnected(true));
		},
		[onLeftRef, shareScreenOnJoin]
	);

	// Hanging up ends the call in Jitsi; the page leaves at once rather than wait for the room to answer
	const leave = useCallback(() => {
		roomApiRef.current?.executeCommand('hangup');
		onLeftRef.current();
	}, [onLeftRef]);

	const rejoin = useCallback(() => {
		setIsDisconnected(false);
		setJoinedAt(null);
		setParticipantCount(null);
		setJoinAttempt((count) => count + 1);
	}, []);

	// After a lost connection the room may have lasted past its token's hour: the page renews it before the room reopens
	const reconnect = useCallback(() => {
		onReconnectRef.current?.();
		rejoin();
	}, [onReconnectRef, rejoin]);

	// The frame fills the space under the room bar
	const handleIFrameRef = useCallback((parentNode: HTMLDivElement) => {
		if (parentNode) {
			parentNode.style.height = '100%';
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
				onRetry={reconnect}
			/>
		);
	}

	return (
		<div className="flex h-dvh w-full flex-col">
			<MeetRoomBar
				title={title}
				joinedAt={joinedAt}
				participantCount={participantCount}
				leave={leave}
				onCopyLink={onCopyLink}
			/>
			{isSharePending && (
				<div
					role="status"
					data-testid="share-screen-pending"
					className="flex shrink-0 flex-wrap items-center gap-2 hairline-b border-border bg-card px-3 py-2 text-sm sm:px-4"
				>
					<span className="min-w-0 flex-1 text-foreground">{t('meetings.SHARE_SCREEN_JITSI_HINT')}</span>
					<Button type="button" variant="ghost" size="sm" onClick={() => setIsSharePending(false)}>
						{t('common.CLOSE')}
					</Button>
				</div>
			)}
			<div className="min-h-0 flex-1">
				<JitsiMeeting
					key={joinAttempt}
					domain={jitsiApi.domain}
					roomName={roomName}
					configOverwrite={{
						startWithAudioMuted: !choices?.audioEnabled,
						startWithVideoMuted: !choices?.videoEnabled,
						disableModeratorIndicator: false,
						startScreenSharing: false,
						enableEmailInStats: false,
						// Ever Teams' own pre-join screen came first, and its own screen says the person left
						prejoinConfig: { enabled: false },
						prejoinPageEnabled: false,
						enableClosePage: false
					}}
					interfaceConfigOverwrite={{
						DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
						MOBILE_APP_PROMO: false,
						SHOW_CHROME_EXTENSION_BANNER: false
					}}
					jwt={jwt}
					devices={jitsiDevicesOf(choices)}
					userInfo={{ displayName: choices?.displayName ?? '', email: '' }}
					spinner={JitsiMeetPageSkeleton}
					onApiReady={handleApiReady}
					getIFrameRef={handleIFrameRef}
				/>
			</div>
		</div>
	);
}
