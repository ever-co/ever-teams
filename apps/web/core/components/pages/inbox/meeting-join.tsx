'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { VideoCall } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useInvitedMeetings } from '@/core/hooks/meetings/use-invited-meetings';
import { useScheduledMeetings } from '@/core/hooks/meetings/use-scheduled-meetings';
import type { MeetingNotice } from '@/core/lib/notifications/meeting-notices';
import { isJitsiMeeting } from '@/core/lib/utils/collaboration';
import { meetingPathOfInput, scheduledMeetingStateOf, type ScheduledMeeting } from '@/core/lib/utils/meetings';

/** How often an open detail checks again whether its meeting opened or closed to joining: the agenda's own pace. */
const MEETING_JOIN_CLOCK_MS = 30_000;

/** Now, moving on every MEETING_JOIN_CLOCK_MS while the detail is open. */
function useClock(): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), MEETING_JOIN_CLOCK_MS);
		return () => window.clearInterval(timer);
	}, []);
	return now;
}

/** Joinable from shortly before the start to the end: a meeting days ahead opens from the meetings page. */
function isJoinable(meeting: ScheduledMeeting, now: number): boolean {
	const state = scheduledMeetingStateOf(meeting, new Date(now));
	return state === 'live' || state === 'soon';
}

/** Whether the meeting can be joined at this very moment: what a click checks, the clock moving every half minute. */
function isJoinableNow(meeting: ScheduledMeeting): boolean {
	return isJoinable(meeting, Date.now());
}

/**
 * The "Join" of a meeting notification (#5022), while the meeting it is about can be joined (from shortly before its
 * start to its end) and has a meeting link: among the person's own meetings, or those they are invited to. It appears
 * and goes as time moves on while the detail stays open, and a click checks the moment again. A meeting cancelled, or
 * one they were removed from, has nothing to join; one days ahead is opened from the meetings page.
 */
export function MeetingJoin({ notice }: Readonly<{ notice: MeetingNotice }>) {
	const t = useTranslations();
	const router = useRouter();
	const own = useScheduledMeetings();
	const invited = useInvitedMeetings();
	const now = useClock();
	const isJitsi = useMemo(() => isJitsiMeeting(), []);
	const hasEnded = notice.kind === 'cancelled' || notice.kind === 'removed';
	const meeting = hasEnded
		? undefined
		: [...invited.meetings, ...own.meetings].find((candidate) => candidate.id === notice.appointmentId);
	const path = meeting?.link ? meetingPathOfInput(meeting.link, isJitsi) : null;
	if (!meeting || !path || !isJoinable(meeting, now)) return null;
	const title = meeting.title || t('meetings.UNTITLED');
	const join = () => {
		// The clock moves every half minute: the moment of the click is the one that counts
		if (isJoinableNow(meeting)) router.push(path);
	};
	return (
		<Button size="sm" variant="outline" onClick={join} aria-label={t('meetings.JOIN_MEETING_OF', { title })}>
			<VideoCall className="size-4" aria-hidden="true" />
			{t('meetings.JOIN')}
		</Button>
	);
}
