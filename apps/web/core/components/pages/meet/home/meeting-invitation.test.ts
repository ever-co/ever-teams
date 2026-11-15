// cspell:ignore Équipe
import { meetingIcsFileNameOf, meetingStartedAgoOf, meetingTimesOf } from './meeting-invitation';

describe('meetingTimesOf', () => {
	// Local times: the agenda writes a meeting's times in the reader's own time zone
	const meeting = { start: new Date(2026, 10, 12, 14, 0), end: new Date(2026, 10, 12, 14, 45) };
	const workspace = (clock: 12 | 24 | null) => ({ tag: 'en-US', dateFormat: null, numberFormat: null, clock });
	// The runtime's formats put narrow and thin spaces around the times
	const plain = (text: string) => text.replace(/[\u00a0\u2009\u202f]/g, ' ');

	it("writes the times on the workspace's clock (#5264), whatever the reader's language would", () => {
		expect(plain(meetingTimesOf(meeting, workspace(24)))).toBe('14:00 – 14:45');
		expect(plain(meetingTimesOf(meeting, workspace(12)))).toBe('2:00 – 2:45 PM');
	});

	it("writes them as the reader's language does without a workspace clock", () => {
		expect(plain(meetingTimesOf(meeting, workspace(null)))).toBe('2:00 – 2:45 PM');
		expect(plain(meetingTimesOf(meeting, 'en-US'))).toBe('2:00 – 2:45 PM');
	});
});

describe('meetingStartedAgoOf', () => {
	const start = new Date('2026-11-12T14:00:00Z');
	const after = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

	it('says how long a running meeting has been on: now, then minutes, then hours', () => {
		expect(meetingStartedAgoOf({ start }, after(0.5), 'en')).toBe('now');
		expect(meetingStartedAgoOf({ start }, after(12), 'en')).toBe('12 minutes ago');
		expect(meetingStartedAgoOf({ start }, after(130), 'en')).toBe('2 hours ago');
		expect(meetingStartedAgoOf({ start }, after(12), 'fr')).toBe('il y a 12 minutes');
	});
});

describe('meetingIcsFileNameOf', () => {
	it('names the calendar file after the title, letters and digits only, one dash between words', () => {
		expect(meetingIcsFileNameOf('  Review; design & plan!  ')).toBe('Review-design-plan.ics');
		expect(meetingIcsFileNameOf('Équipe: sprint 12')).toBe('Équipe-sprint-12.ics');
		expect(meetingIcsFileNameOf('a -- b')).toBe('a-b.ics');
	});

	it('falls back to "meeting" for a title with no letter or digit', () => {
		expect(meetingIcsFileNameOf('')).toBe('meeting.ics');
		expect(meetingIcsFileNameOf(` ${'-'.repeat(10_000)} `)).toBe('meeting.ics');
	});
});
