'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { VideoCall } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { useInvitedMeetings } from '@/core/hooks/meetings/use-invited-meetings';
import { useScheduledMeetings } from '@/core/hooks/meetings/use-scheduled-meetings';
import type { MeetingNotice } from '@/core/lib/notifications/meeting-notices';
import { isJitsiMeeting } from '@/core/lib/utils/collaboration';
import { meetingPathOfInput, scheduledMeetingStateOf } from '@/core/lib/utils/meetings';

/**
 * The "Join" of a meeting notification (#5022), while the meeting it is about can be joined (from shortly before its
 * start to its end) and has a meeting link: among the person's own meetings, or those they are invited to. A meeting
 * cancelled, or one they were removed from, has nothing to join; one days ahead is opened from the meetings page.
 */
export function MeetingJoin({ notice }: Readonly<{ notice: MeetingNotice }>) {
	const t = useTranslations();
	const router = useRouter();
	const own = useScheduledMeetings();
	const invited = useInvitedMeetings();
	const isJitsi = useMemo(() => isJitsiMeeting(), []);
	const hasEnded = notice.kind === 'cancelled' || notice.kind === 'removed';
	const meeting = hasEnded
		? undefined
		: [...invited.meetings, ...own.meetings].find((candidate) => candidate.id === notice.appointmentId);
	const path = meeting?.link ? meetingPathOfInput(meeting.link, isJitsi) : null;
	// Joinable from shortly before the start to the end: a meeting days ahead opens from the meetings page
	const state = meeting ? scheduledMeetingStateOf(meeting, new Date()) : 'ended';
	if (!meeting || !path || (state !== 'live' && state !== 'soon')) return null;
	const title = meeting.title || t('meetings.UNTITLED');
	return (
		<Button
			size="sm"
			variant="outline"
			onClick={() => router.push(path)}
			aria-label={t('meetings.JOIN_MEETING_OF', { title })}
		>
			<VideoCall className="size-4" aria-hidden="true" />
			{t('meetings.JOIN')}
		</Button>
	);
}
