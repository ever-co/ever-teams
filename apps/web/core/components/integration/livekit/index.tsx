'use client';
import React from 'react';
import { LiveKitRoom, LocalUserChoices, useParticipants, useRoomContext } from '@livekit/components-react';
import { RoomConnectOptions, RoomOptions, VideoPresets } from 'livekit-client';
import { useTranslations } from 'next-intl';
import '@livekit/components-styles';
import { Button } from '@/core/components/duplicated-components/_button';
import { ScreenShare } from '@/core/components/icons';
import { MeetConference } from './meet-conference';
import { NoiseFilterChoiceContext } from './settings-livekit';
import { MeetRoomSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';
import { MeetRoomBar } from '@/core/components/pages/meet/room/meet-room-bar';

type LiveKitPageProps = {
	userChoices: LocalUserChoices;
	/** The speaker picked before joining; empty for the system's default. */
	audioOutputDeviceId?: string;
	/** The background noise filter of the video and audio settings: on unless turned off there. */
	noiseFilter?: boolean;
	/** HD video of the video and audio settings: the camera captured in 720p, else in 360p. */
	hdVideo?: boolean;
	roomName?: string;
	region?: string;
	token?: string;
	liveKitUrl?: string;
	/** What the room's bar calls the meeting; null for a room with a random name. */
	title?: string | null;
	/** The meeting was started to show the screen: sharing starts as soon as the room is joined. */
	shareScreenOnJoin?: boolean;
	onLeave?: () => void;
	onCopyLink?: () => void;
};

/**
 * LiveKit's own colors and font, set to the app's: the conference keeps LiveKit's dark room, with the app's accent
 * on its buttons and the app's type.
 */
const ROOM_THEME =
	'[--lk-accent-bg:var(--primary)] [--lk-accent-fg:var(--primary-foreground)] [--lk-danger:var(--destructive)] [--lk-font-family:inherit] [--lk-border-radius:0.5rem]';

/** The protocol's number of the screen's sound among the sources a participant may be allowed to publish. */
const SCREEN_SHARE_AUDIO_SOURCE = 4;

/** The room bar inside the LiveKit room, where the room and its participants are at hand. */
function LiveKitRoomBar({
	title,
	joinedAt,
	onCopyLink
}: Readonly<{ title: string | null; joinedAt: number | null; onCopyLink: () => void }>) {
	const room = useRoomContext();
	const participants = useParticipants();
	const leave = React.useCallback(() => {
		void room.disconnect();
	}, [room]);

	return (
		<MeetRoomBar
			title={title}
			joinedAt={joinedAt}
			participantCount={joinedAt === null ? null : participants.length}
			leave={leave}
			onCopyLink={onCopyLink}
		/>
	);
}

/**
 * Shares the screen once the room is joined. A browser may refuse a share no click asked for (Safari, and Firefox a few
 * seconds after the last click): a band under the room's bar then says so and offers the click it wants.
 */
function ShareScreenOnJoin() {
	const t = useTranslations();
	const room = useRoomContext();
	const [isRefused, setIsRefused] = React.useState(false);
	const hasAsked = React.useRef(false);

	const share = React.useCallback(async () => {
		// The screen's sound only where the room lets one publish it: a refused sound would fail the whole share
		const sources = room.localParticipant.permissions?.canPublishSources ?? [];
		const audio = sources.length === 0 || sources.includes(SCREEN_SHARE_AUDIO_SOURCE);
		try {
			await room.localParticipant.setScreenShareEnabled(true, { audio, selfBrowserSurface: 'include' });
			setIsRefused(false);
		} catch {
			setIsRefused(true);
		}
	}, [room]);

	React.useEffect(() => {
		if (hasAsked.current) return;
		hasAsked.current = true;
		void share();
	}, [share]);

	if (!isRefused) return null;
	return (
		<div
			role="alert"
			data-testid="share-screen-refused"
			className="flex shrink-0 flex-wrap items-center gap-2 hairline-b border-border bg-card px-3 py-2 text-sm sm:px-4"
		>
			<span className="min-w-0 flex-1 text-foreground">{t('meetings.SHARE_SCREEN_REFUSED')}</span>
			<Button type="button" size="sm" onClick={() => void share()}>
				<ScreenShare className="size-4" aria-hidden="true" />
				{t('meetings.SHARE_SCREEN')}
			</Button>
			<Button type="button" variant="ghost" size="sm" onClick={() => setIsRefused(false)}>
				{t('common.CLOSE')}
			</Button>
		</div>
	);
}

export default function LiveKitPage({
	userChoices,
	audioOutputDeviceId = '',
	noiseFilter = true,
	hdVideo = true,
	onLeave,
	token,
	liveKitUrl,
	title = null,
	shareScreenOnJoin = false,
	onCopyLink = () => undefined
}: Readonly<LiveKitPageProps>) {
	const [error, setError] = React.useState<string>();
	const [joinedAt, setJoinedAt] = React.useState<number | null>(null);

	React.useEffect(() => {
		if (!token || !liveKitUrl) {
			setError('LiveKitPage: token and liveKitUrl are required');
			return;
		}
		setError(undefined);
	}, [token, liveKitUrl]);

	// Leaving needs no cleanup of its own: LiveKitRoom disconnects the room when it unmounts, and the disconnect stops the
	// local camera and microphone tracks. Asking for a new stream to stop it would turn the camera on as the user leaves.

	const connectOptions = React.useMemo(
		(): RoomConnectOptions => ({
			autoSubscribe: true
		}),
		[]
	);

	// The devices and the video quality picked before joining; LiveKit reads its options once, when it creates the room
	const roomOptions = React.useMemo(
		(): RoomOptions => ({
			videoCaptureDefaults: {
				...(userChoices.videoDeviceId ? { deviceId: userChoices.videoDeviceId } : {}),
				resolution: (hdVideo ? VideoPresets.h720 : VideoPresets.h360).resolution
			},
			audioCaptureDefaults: userChoices.audioDeviceId ? { deviceId: userChoices.audioDeviceId } : undefined,
			audioOutput: audioOutputDeviceId ? { deviceId: audioOutputDeviceId } : undefined
		}),
		[userChoices.videoDeviceId, userChoices.audioDeviceId, audioOutputDeviceId, hdVideo]
	);

	const LiveKitRoomComponent = LiveKitRoom as React.ElementType;

	if (error) {
		return (
			<div className="flex items-center justify-center h-[100dvh] text-destructive-ink p-4 text-center">
				<div className="bg-destructive/10 rounded-lg p-4 max-w-md text-sm">{error}</div>
			</div>
		);
	}
	return (
		<LiveKitRoomComponent
			className={`!bg-muted ${ROOM_THEME}`}
			onError={(err: Error) => {
				console.error('LiveKit connection error:', err);
				const errorMessages = {
					'Room is full': 'The video conference room is full',
					'Permission denied': 'Permission denied. Please allow camera/microphone access',
					'Connection failed': 'Failed to connect. Please check your internet connection',
					'Invalid token': 'Authentication failed. Please try again'
				} as const;
				setError(
					errorMessages[err.message as keyof typeof errorMessages] ?? 'Failed to connect to video conference'
				);
			}}
			onConnected={() => setJoinedAt(Date.now())}
			connectOptions={connectOptions}
			options={roomOptions}
			audio={userChoices.audioEnabled}
			video={userChoices.videoEnabled}
			token={token}
			serverUrl={liveKitUrl}
			connect={true}
			data-lk-theme="default"
			style={{
				height: '100dvh',
				width: '100%',
				display: 'flex',
				flexDirection: 'column',
				position: 'relative',
				overflow: 'hidden',
				isolation: 'isolate'
			}}
			onDisconnected={onLeave}
		>
			<LiveKitRoomBar title={title} joinedAt={joinedAt} onCopyLink={onCopyLink} />
			{joinedAt !== null && shareScreenOnJoin && <ShareScreenOnJoin />}
			{joinedAt === null && <MeetRoomSkeleton className="h-full" />}
			{joinedAt !== null && (
				<div className="min-h-0 flex-1">
					<NoiseFilterChoiceContext.Provider value={noiseFilter}>
						<MeetConference />
					</NoiseFilterChoiceContext.Provider>
				</div>
			)}
		</LiveKitRoomComponent>
	);
}
