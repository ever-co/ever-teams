'use client';

import { MEET_DOMAIN } from '@/core/constants/config/constants';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/core/components/common/button';
import { CircleAlert } from '@/core/components/icons';
import { JitsiMeetPageSkeleton } from '@/core/components/pages/meet/meet-room-skeleton';

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
			<div className="flex flex-col items-center justify-center gap-1 p-4 text-center">
				<div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive-ink">
					<CircleAlert className="size-5" />
				</div>
				<h2 className="text-sm font-semibold text-balance text-foreground">Failed to initialize meeting</h2>
				<p className="mb-3 text-sm text-balance text-muted-foreground">{error.message}</p>
				<Button size="default" onClick={() => router.push('/')}>
					Return Home
				</Button>
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
