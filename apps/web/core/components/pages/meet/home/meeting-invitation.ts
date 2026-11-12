import type { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { meetingIcsOf, type ScheduledMeeting } from '@/core/lib/utils/meetings';

/** "Thursday, November 12, 2026, 2:00 – 2:45 PM", in the reader's language. */
export function meetingWhenOf(meeting: Pick<ScheduledMeeting, 'start' | 'end'>, locale: string): string {
	const format = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' });
	return format.formatRange(meeting.start, meeting.end);
}

/** "2:00 – 2:45 PM": the time range alone, for an agenda that already says the day. */
export function meetingTimesOf(meeting: Pick<ScheduledMeeting, 'start' | 'end'>, locale: string): string {
	const format = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
	return format.formatRange(meeting.start, meeting.end);
}

/** "12 minutes ago", "2 hours ago", or "now" in its first minute: how long a running meeting has been on. */
export function meetingStartedAgoOf(meeting: Pick<ScheduledMeeting, 'start'>, now: Date, locale: string): string {
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	const minutes = Math.floor((now.getTime() - meeting.start.getTime()) / 60_000);
	if (minutes < 1) {
		return format.format(0, 'second');
	}
	if (minutes < 60) {
		return format.format(-minutes, 'minute');
	}
	return format.format(-Math.floor(minutes / 60), 'hour');
}

/** "Sprint-review.ics": the meeting's title, letters and digits only, for the name of its calendar file. */
export function meetingIcsFileNameOf(title: string): string {
	// Every run of other characters is one dash now, so one dash at most comes off each end (no backtracking)
	const name = title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
	return `${name || 'meeting'}.ics`;
}

/** Saves the meeting as a calendar file, which every calendar app imports and can send to the people invited. */
export function downloadMeetingIcs(meeting: ScheduledMeeting & { link: string }) {
	const blob = new Blob([meetingIcsOf(meeting)], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = meetingIcsFileNameOf(meeting.title);
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export async function copyMeetingText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/**
 * Copies the invitation to a meeting: its title, when it runs and its link, in the reader's language. A browser that
 * refuses the clipboard gets the text in a notice, to copy by hand.
 */
export async function copyMeetingInvitation(
	meeting: Pick<ScheduledMeeting, 'title' | 'start' | 'end'> & { link: string },
	locale: string,
	t: ReturnType<typeof useTranslations>
): Promise<void> {
	const text = t('meetings.INVITATION_TEXT', {
		title: meeting.title,
		when: meetingWhenOf(meeting, locale),
		link: meeting.link
	});
	const isCopied = await copyMeetingText(text);
	if (isCopied) {
		toast.success(t('meetings.INVITATION_COPIED'));
	} else {
		toast.info(t('meetings.COPY_INVITATION'), { description: text, duration: 10000 });
	}
}
