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

/** Saves the meeting as a calendar file, which every calendar app imports and can send to the people invited. */
export function downloadMeetingIcs(meeting: ScheduledMeeting & { link: string }) {
	const blob = new Blob([meetingIcsOf(meeting)], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = `${meeting.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'meeting'}.ics`;
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
