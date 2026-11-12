'use client';
import React from 'react';
import {
	LiveKitRoom,
	VideoConference,
	formatChatMessageLinks,
	LocalUserChoices,
	useParticipants,
	useRoomContext
} from '@livekit/components-react';
import { RoomConnectOptions, RoomOptions } from 'livekit-client';
import '@livekit/components-styles';
import { SettingsMenu } from './settings-livekit';
import { MeetRoomSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';
import { MeetRoomBar } from '@/core/components/pages/meet/room/meet-room-bar';

type LiveKitPageProps = {
	userChoices: LocalUserChoices;
	/** The speaker picked before joining; empty for the system's default. */
	audioOutputDeviceId?: string;
	roomName?: string;
	region?: string;
	token?: string;
	liveKitUrl?: string;
	/** What the room's bar calls the meeting; null for a room with a random name. */
	title?: string | null;
	onLeave?: () => void;
	onCopyLink?: () => void;
};

/**
 * LiveKit's own colors and font, set to the app's: the conference keeps LiveKit's dark room, with the app's accent
 * on its buttons and the app's type.
 */
const ROOM_THEME =
	'[--lk-accent-bg:var(--primary)] [--lk-accent-fg:var(--primary-foreground)] [--lk-danger:var(--destructive)] [--lk-font-family:inherit] [--lk-border-radius:0.5rem]';

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

export default function LiveKitPage({
	userChoices,
	audioOutputDeviceId = '',
	onLeave,
	token,
	liveKitUrl,
	title = null,
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

	// The devices picked before joining; LiveKit reads its options once, when it creates the room
	const roomOptions = React.useMemo(
		(): RoomOptions => ({
			videoCaptureDefaults: userChoices.videoDeviceId ? { deviceId: userChoices.videoDeviceId } : undefined,
			audioCaptureDefaults: userChoices.audioDeviceId ? { deviceId: userChoices.audioDeviceId } : undefined,
			audioOutput: audioOutputDeviceId ? { deviceId: audioOutputDeviceId } : undefined
		}),
		[userChoices.videoDeviceId, userChoices.audioDeviceId, audioOutputDeviceId]
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
			{joinedAt === null && <MeetRoomSkeleton className="h-full" />}
			{joinedAt !== null && (
				<div className="min-h-0 flex-1">
					<VideoConference chatMessageFormatter={formatChatMessageLinks} SettingsComponent={SettingsMenu} />
				</div>
			)}
		</LiveKitRoomComponent>
	);
}
