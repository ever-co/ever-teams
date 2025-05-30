'use client';

import { useCollaborative, useQueryCall } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { BackdropLoader, Meta } from '@/core/components';
import dynamic from 'next/dynamic';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { meetAuthService } from '@/core/services/client/api/auth/meet-auth';

// Maximum number of retry attempts
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Lazy load Meet component
const Meet = dynamic(() => import('@/core/components/integration/meet'), {
	ssr: false,
	loading: () => <BackdropLoader show />
});

function useMeetJwtToken(room?: string) {
	const [token, setToken] = useState<string>();
	const [error, setError] = useState<Error>();
	const [retryCount, setRetryCount] = useState(0);
	const { queryCall, loading } = useQueryCall(meetAuthService.getMeetJwtAuthToken);

	useEffect(() => {
		const getToken = async () => {
			try {
				const res = await queryCall({ room });
				setToken(res.data.token);
				setError(undefined);
			} catch (err) {
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

		if (room) {
			getToken();
		}
	}, [queryCall, retryCount, room]); // Added room to dependencies

	// Reset retry count when query or room changes
	useEffect(() => {
		setRetryCount(0);
	}, [queryCall, room]);

	return { loading, token, error, retrying: retryCount > 0 };
}

function MeetPage() {
	const router = useRouter();
	const pathname = usePathname();
	const replaced = useRef(false);

	// Extract room name from URL with proper validation
	const room = useMemo(() => {
		if (!pathname) return null;

		const queryIndex = pathname.indexOf('?');
		if (queryIndex === -1) return null;

		const urlParams = pathname.substring(queryIndex);
		const searchParams = new URLSearchParams(urlParams);
		const roomParam = searchParams.get('room');

		return roomParam && /^[A-Za-z0-9+/=]+$/.test(roomParam) ? roomParam : null;
	}, [pathname]);

	const { token, error, retrying } = useMeetJwtToken(room || undefined);
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

	// Decode room name with validation
	const roomName = useMemo(() => {
		if (!room) return null;
		try {
			return atob(room);
		} catch {
			return null;
		}
	}, [room]);

	// Show error or retrying state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-4">
				<h2 className="text-xl font-semibold text-red-600 mb-2">Failed to initialize meeting</h2>
				<p className="text-gray-600 mb-4">{error.message}</p>
				<button
					onClick={() => window.location.reload()}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Try Again
				</button>
			</div>
		);
	}

	if (retrying) {
		return (
			<div className="flex items-center justify-center p-4">
				<BackdropLoader show />
				<p className="ml-2">Reconnecting...</p>
			</div>
		);
	}

	return (
		<>
			<Meta title="Meet" />
			{token && roomName && <Meet jwt={token} roomName={encodeURIComponent(roomName)} />}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false
});
