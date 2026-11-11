// cspell:ignore Équipe
import { meetingIcsFileNameOf } from './meeting-invitation';

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
