'use client';

import { useCollaborative } from '@/core/hooks';
import { useMeetJwtToken } from '@/core/hooks/common/use-meet-jwt-token';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Meta } from '@/core/components';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { JitsiMeetPageSkeleton, MeetRoomSkeleton } from '../meet-room-skeleton';
import { MeetRoomError } from '../meet-room-error';

// Import optimized components from centralized location
import { LazyMeet as Meet } from '@/core/components/optimized-components/meet';

// The Jitsi page, with or without the locale prefix of a non-default language (/fr/meet/jitsi)
const JITSI_PAGE_PATH = /(^|\/)meet\/jitsi\/?$/;

function MeetPage() {
	const t = useTranslations();
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

	const { meeting, error, retrying, retry } = useMeetJwtToken(roomName || undefined);
	const { randomMeetName } = useCollaborative();

	// Handle room creation and navigation
	useEffect(() => {
		const isJitsiPage = Boolean(pathname && JITSI_PAGE_PATH.test(pathname));
		if (!room && isJitsiPage && !replaced.current) {
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
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)}
				onRetry={retry}
			/>
		);
	}

	if (retrying) {
		return <MeetRoomSkeleton label={t('collaborate.RECONNECTING_MEETING')} />;
	}

	const hasToken = Boolean(meeting?.token);
	const hasRoom = Boolean(meeting?.room);
	const hasMeeting = hasToken && hasRoom;

	return (
		<>
			<Meta title="Meet" />
			{!hasMeeting && <JitsiMeetPageSkeleton />}
			{/* The room the server issued the token for: the link's room scoped to the user's tenant */}
			{meeting && hasMeeting && <Meet jwt={meeting.token} roomName={meeting.room} />}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false,
	skeleton: JitsiMeetPageSkeleton
});
