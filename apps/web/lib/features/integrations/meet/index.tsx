'use client';

import { MEET_DOMAIN } from '@app/constants';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface MeetPageProps {
	jwt: string;
	roomName: string;
}

export default function MeetPage({ jwt, roomName }: MeetPageProps) {
	const router = useRouter();
	const [error, setError] = useState<Error>();

	// Validate props
	useEffect(() => {
		if (!jwt) {
			setError(new Error('JWT token is required'));
			return;
		}
		if (!roomName) {
			setError(new Error('Room name is required'));
			return;
		}
	}, [jwt, roomName]);

	// Handle meeting close
	const handleClose = useCallback(() => {
		try {
			router.push('/');
		} catch (err) {
			console.error('Failed to redirect after meeting close:', err);
		}
	}, [router]);

	// Handle API ready
	const handleApiReady = useCallback(
		(externalApi: any) => {
			try {
				externalApi.addListener('readyToClose', handleClose);

				// Add error handling
				externalApi.addListener('videoConferenceLeft', handleClose);
				externalApi.addListener('connectionFailed', () => {
					setError(new Error('Failed to connect to meeting'));
				});
			} catch (err) {
				console.error('Failed to setup meeting API:', err);
				setError(err as Error);
			}
		},
		[handleClose]
	);

	// Handle iframe setup
	const handleIFrameRef = useCallback((parentNode: HTMLDivElement) => {
		if (parentNode) {
			parentNode.style.height = '100vh';
		}
	}, []);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-4">
				<h2 className="text-xl font-semibold text-red-600 mb-2">Failed to initialize meeting</h2>
				<p className="text-gray-600 mb-4">{error.message}</p>
				<button
					onClick={() => router.push('/')}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Return Home
				</button>
			</div>
		);
	}

	return (
		<JitsiMeeting
			domain={MEET_DOMAIN.value}
			roomName={roomName}
			configOverwrite={{
				startWithAudioMuted: true,
				startWithVideoMuted: true,
				disableModeratorIndicator: false,
				startScreenSharing: false,
				enableEmailInStats: false,
				prejoinPageEnabled: true,
				enableClosePage: true
			}}
			interfaceConfigOverwrite={{
				DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
				MOBILE_APP_PROMO: false,
				SHOW_CHROME_EXTENSION_BANNER: false
			}}
			jwt={jwt}
			onApiReady={handleApiReady}
			getIFrameRef={handleIFrameRef}
		/>
	);
}
