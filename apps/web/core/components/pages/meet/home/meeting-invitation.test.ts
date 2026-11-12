// cspell:ignore Équipe
import { meetingIcsFileNameOf, meetingStartedAgoOf } from './meeting-invitation';

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
