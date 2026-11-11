'use client';
import React from 'react';
import { LiveKitRoom, VideoConference, formatChatMessageLinks, LocalUserChoices } from '@livekit/components-react';
import { RoomConnectOptions } from 'livekit-client';
import '@livekit/components-styles';
import { SettingsMenu } from './settings-livekit';
import { MeetRoomSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';

type LiveKitPageProps = {
	userChoices: LocalUserChoices;
	roomName?: string;
	region?: string;
	token?: string;
	liveKitUrl?: string;
	onLeave?: () => void;
};

export default function LiveKitPage({ userChoices, onLeave, token, liveKitUrl }: Readonly<LiveKitPageProps>) {
	const [error, setError] = React.useState<string>();
	const [isLoading, setIsLoading] = React.useState(true);

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
			className="!bg-muted"
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
			onConnected={() => setIsLoading(false)}
			connectOptions={connectOptions}
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
			{isLoading && <MeetRoomSkeleton className="h-full" />}
			{!isLoading && (
				<VideoConference chatMessageFormatter={formatChatMessageLinks} SettingsComponent={SettingsMenu} />
			)}
		</LiveKitRoomComponent>
	);
}
