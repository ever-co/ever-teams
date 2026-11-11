'use client';

import { useCollaborative } from '@/core/hooks';
import { useMeetJwtToken } from '@/core/hooks/common/use-meet-jwt-token';
import { useMeetingRoomFlow } from '@/core/hooks/meetings/use-meeting-room-flow';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Meta } from '@/core/components';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { roomNameOfParam } from '@/core/lib/utils/meetings';
import { JitsiMeetPageSkeleton, MeetRoomSkeleton } from '../meet-room-skeleton';
import { MeetRoomError } from '../meet-room-error';
import { MeetPreJoin } from '../pre-join/meet-pre-join';
import { MeetLeft } from '../room/meet-left';

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
	const { data: user } = useUserQuery();

	// Extract room name from URL with proper validation
	const room = useMemo(() => {
		// Links carry the room unencoded, so a base64 "+" arrives as a space (base64 has no spaces)
		const roomParam = params.get('room')?.replace(/ /g, '+');

		return roomParam && /^[A-Za-z0-9+/=]+$/.test(roomParam) ? roomParam : null;
	}, [params]);

	// Decode room name with validation. The room's identity stays `atob` of the link, as every version reads it;
	// its UTF-8 reading is only the title the page shows.
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
	const flow = useMeetingRoomFlow(useMemo(() => roomNameOfParam(room), [room]));

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

	// The token is asked for while the person checks their devices: an error shows at once, instead of after "Join"
	if (error) {
		return (
			<MeetRoomError
				title={t('collaborate.MEETING_UNAVAILABLE')}
				description={t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)}
				onRetry={retry}
			/>
		);
	}

	const hasMeeting = Boolean(meeting?.token && meeting?.room);

	return (
		<>
			<Meta title={flow.title ?? t('meetings.TITLE')} />
			{flow.stage === 'prejoin' && (
				<MeetPreJoin
					title={flow.title}
					displayName={user?.name || user?.email || ''}
					onJoin={flow.join}
					onBack={flow.backToMeetings}
					onCopyLink={flow.copyLink}
				/>
			)}
			{flow.stage === 'left' && (
				<MeetLeft title={flow.title} onRejoin={flow.rejoin} onBack={flow.backToMeetings} />
			)}
			{flow.stage === 'room' && retrying && <MeetRoomSkeleton label={t('collaborate.RECONNECTING_MEETING')} />}
			{flow.stage === 'room' && !retrying && !hasMeeting && <JitsiMeetPageSkeleton />}
			{/* The room the server issued the token for: the link's room scoped to the user's tenant */}
			{flow.stage === 'room' && !retrying && meeting && hasMeeting && (
				<Meet
					key={flow.attempt}
					jwt={meeting.token}
					roomName={meeting.room}
					title={flow.title}
					choices={flow.choices}
					onLeft={flow.leave}
					onCopyLink={flow.copyLink}
				/>
			)}
		</>
	);
}

export default withAuthentication(MeetPage, {
	displayName: 'MeetPage',
	showPageSkeleton: false,
	skeleton: JitsiMeetPageSkeleton
});
