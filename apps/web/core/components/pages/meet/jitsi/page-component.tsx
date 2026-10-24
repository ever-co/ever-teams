'use client';

import { useCollaborative, useQueryCall } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { BackdropLoader, Meta } from '@/core/components';
// dynamic import removed - using optimized components
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { meetAuthService } from '@/core/services/client/api/auth/meet-auth';

// Maximum number of retry attempts
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Import optimized components from centralized location
import { LazyMeet as Meet } from '@/core/components/optimized-components/meet';

function useMeetJwtToken(room?: string) {
	// The token only opens the room it was issued with, so both come from the same response
	const [issued, setIssued] = useState<{ requested: string; token: string; room: string }>();
	const [error, setError] = useState<Error>();
	const [retryCount, setRetryCount] = useState(0);
	const { queryCall, loading } = useQueryCall(meetAuthService.getMeetJwtAuthToken);

	useEffect(() => {
		// The answer for a room the user already left must not replace the one for the room on screen
		let current = true;

		const getToken = async () => {
			if (!room) return;
			try {
				const res = await queryCall({ room });
				if (!current) return;
				setIssued({ requested: room, token: res.data.token, room: res.data.room });
				setError(undefined);
			} catch (err) {
				if (!current) return;
				console.error('Failed to fetch JWT token:', err);

				// If we haven't exceeded max retries, try again after delay
				if (retryCount < MAX_RETRIES) {
					setTimeout(() => {
						setRetryCount((prev) => prev + 1);
					}, RETRY_DELAY);
					return;
				}

				setError(err as Error);
			}
		};

		getToken();

		return () => {
			current = false;
		};
	}, [queryCall, retryCount, room]); // Added room to dependencies

	// Reset retry count when query or room changes
	useEffect(() => {
		setRetryCount(0);
	}, [queryCall, room]);

	// A previous room's token would keep the user in the meeting they just left
	const meeting = issued?.requested === room ? issued : undefined;

	return { loading, meeting, error, retrying: retryCount > 0 };
}

function MeetPage() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const replaced = useRef(false);

	// Extract room name from URL with proper validation
	const room = useMemo(() => {
		// Links carry the room unencoded, so a base64 "+" arrives as a space (base64 has no spaces)
		const roomParam = params.get('room')?.replace(/ /g, '+');

		return roomParam && /^[A-Za-z0-9+/=]+$/.test(roomParam) ? roomParam : null;
	}, [params]);

	// Decode room name with validation
	const roomName = useMemo(() => {
		if (!room) return null;
		try {
			return atob(room);
		} catch {
			return null;
		}
	}, [room]);

	const { meeting, error, retrying } = useMeetJwtToken(roomName || undefined);
	const { randomMeetName } = useCollaborative();

	// Handle room creation and navigation
	useEffect(() => {
		if (!room && pathname?.startsWith('/meet/jitsi') && !replaced.current) {
			try {
				const url = new URL(window.location.href);
				const newRoom = btoa(randomMeetName());
				url.searchParams.set('room', newRoom);
				router.replace(url.pathname + url.search);
				replaced.current = true;
			} catch (err) {
				console.error('Failed to create room:', err);
			}
		}
	}, [room, router, randomMeetName, pathname]);

	// Show error or retrying state
	if (error) {
		return (
			<div className="flex flex-col justify-center items-center p-4">
				<h2 className="mb-2 text-xl font-semibold text-red-600">Failed to initialize meeting</h2>
				<p className="mb-4 text-gray-600">{error.message}</p>
				<button
					onClick={() => router.refresh()}
					className="px-4 py-2 text-white bg-blue-500 rounded-sm hover:bg-blue-600"
				>
					Try Again
				</button>
			</div>
		);
	}

	if (retrying) {
		return (
			<div className="flex justify-center items-center p-4">
				<BackdropLoader show />
				<p className="ml-2">Reconnecting...</p>
			</div>
		);
	}

	return (
		<>
			<Meta title="Meet" />
			{/* The room the server issued the token for: the link's room scoped to the user's tenant */}
			{meeting?.token && meeting.room && <Meet jwt={meeting.token} roomName={meeting.room} />}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false
});
