// cspell:ignore DTEND DTSTART VCALENDAR XATTENDEE Équipe
import { meetPathFor } from './collaboration';
import {
	agendaOf,
	appointmentInputOf,
	meetingIcsOf,
	meetingPathFor,
	meetingPathOfInput,
	meetingTitleOf,
	roomNameOfParam,
	scheduledMeetingOf,
	scheduledMeetingStateOf,
	type ScheduledMeeting
} from './meetings';

const encodedRoom = (name: string) => new URLSearchParams(meetPathFor(name, true).split('?')[1]).get('room') ?? '';

function meeting(id: string, start: string, end: string, extra: Partial<ScheduledMeeting> = {}): ScheduledMeeting {
	return {
		id,
		title: `Meeting ${id}`,
		description: null,
		start: new Date(start),
		end: new Date(end),
		link: `https://app.example.com/meet/jitsi?room=${id}`,
		...extra
	};
}

describe('meeting links', () => {
	it('reads the room a link carries, in UTF-8, and refuses what is no room', () => {
		expect(roomNameOfParam(encodedRoom('Équipe-Zoé-AbCdEfGhIj'))).toBe('Équipe-Zoé-AbCdEfGhIj');
		// A "+" of the base64 arrives as a space when the link was pasted unencoded
		expect(roomNameOfParam(encodedRoom('Team-Zoé-AbCdEfGh+j').replace(/\+/g, ' '))).toBe(
			roomNameOfParam(encodedRoom('Team-Zoé-AbCdEfGh+j'))
		);
		expect(roomNameOfParam('not base64!')).toBeNull();
		expect(roomNameOfParam(undefined)).toBeNull();
	});

	it('opens a pasted link of either meeting server on this deployment, with its title', () => {
		const room = encodedRoom('Ever-Ruslan-AbCdEfGhIj');
		const jitsiLink = `https://app.ever.team/fr/meet/jitsi?room=${encodeURIComponent(room)}&title=Daily%20standup`;
		const liveKitLink = `https://teams.example.com/meet/livekit?roomName=${encodeURIComponent(room)}`;

		expect(meetingPathOfInput(jitsiLink, true)).toBe(
			meetingPathFor('Ever-Ruslan-AbCdEfGhIj', true, 'Daily standup')
		);
		expect(meetingPathOfInput(liveKitLink, true)).toBe(meetPathFor('Ever-Ruslan-AbCdEfGhIj', true));
		expect(meetingPathOfInput(jitsiLink, false)).toBe(
			meetingPathFor('Ever-Ruslan-AbCdEfGhIj', false, 'Daily standup')
		);
	});

	it('opens a typed room name, and refuses a meeting link without a room or text that is neither', () => {
		expect(meetingPathOfInput('  design-review ', true)).toBe(meetPathFor('design-review', true));
		expect(meetingPathOfInput('https://app.ever.team/meet/jitsi', true)).toBeNull();
		expect(meetingPathOfInput('https://app.ever.team/meet/jitsi?room=%%%', true)).toBeNull();
		expect(meetingPathOfInput('hello world', true)).toBeNull();
		expect(meetingPathOfInput('', true)).toBeNull();
	});

	it('titles a meeting by its link, else by the team and people of its room', () => {
		expect(meetingTitleOf('Ever-Ruslan-Kim-AbCdEfGhIj', 'Sprint review')).toBe('Sprint review');
		expect(meetingTitleOf('Ever-Ruslan-Kim-AbCd_fG-Ij')).toBe('Ever · Ruslan, Kim');
		expect(meetingTitleOf('Ever-AbCdEfGhIj')).toBe('Ever');
		// A random name only (the page made one up) has no title
		expect(meetingTitleOf('V1StGXR8Z5jdHi6')).toBeNull();
	});
});

describe('scheduled meetings', () => {
	const now = new Date('2026-11-11T10:00:00');

	it('opens a meeting ten minutes before it starts and closes it at its end', () => {
		expect(scheduledMeetingStateOf(meeting('a', '2026-11-11T10:30:00', '2026-11-11T11:00:00'), now)).toBe('later');
		expect(scheduledMeetingStateOf(meeting('a', '2026-11-11T10:10:00', '2026-11-11T11:00:00'), now)).toBe('soon');
		expect(scheduledMeetingStateOf(meeting('a', '2026-11-11T09:30:00', '2026-11-11T10:30:00'), now)).toBe('live');
		expect(scheduledMeetingStateOf(meeting('a', '2026-11-11T09:00:00', '2026-11-11T10:00:00'), now)).toBe('ended');
	});

	it('lays out the agenda by day: today always, its ended meetings kept, then the next days that hold one', () => {
		const agenda = agendaOf(
			[
				meeting('next-week', '2026-11-19T09:00:00', '2026-11-19T10:00:00'),
				meeting('tomorrow', '2026-11-12T09:00:00', '2026-11-12T09:30:00'),
				meeting('this-morning', '2026-11-11T08:00:00', '2026-11-11T08:30:00'),
				meeting('yesterday', '2026-11-10T09:00:00', '2026-11-10T10:00:00'),
				meeting('overnight', '2026-11-10T23:00:00', '2026-11-11T01:00:00'),
				meeting('later-today', '2026-11-11T15:00:00', '2026-11-11T16:00:00')
			],
			now
		);

		expect(agenda.map(({ day, meetings }) => [day.getDate(), meetings.map(({ id }) => id)])).toEqual([
			[11, ['overnight', 'this-morning', 'later-today']],
			[12, ['tomorrow']]
		]);
		expect(agendaOf([], now)).toEqual([{ day: new Date('2026-11-11T00:00:00'), meetings: [] }]);
	});

	it('reads a meeting from an appointment, and skips a cancelled one or one without times', () => {
		expect(
			scheduledMeetingOf({
				id: 'a1',
				agenda: ' Planning ',
				location: 'https://app.example.com/meet/jitsi?room=abc',
				startDateTime: '2026-11-11T09:00:00.000Z',
				endDateTime: '2026-11-11T09:30:00.000Z'
			})
		).toEqual({
			id: 'a1',
			title: 'Planning',
			description: null,
			start: new Date('2026-11-11T09:00:00.000Z'),
			end: new Date('2026-11-11T09:30:00.000Z'),
			link: 'https://app.example.com/meet/jitsi?room=abc'
		});
		expect(
			scheduledMeetingOf({
				id: 'a2',
				startDateTime: '2026-11-11T09:00:00Z',
				endDateTime: '2026-11-11T09:30:00Z',
				status: 'CANCELLED'
			})
		).toBeNull();
		expect(scheduledMeetingOf({ id: 'a3', startDateTime: null, endDateTime: '2026-11-11T09:30:00Z' })).toBeNull();
	});

	it('stores a scheduled meeting as an appointment of its organizer, without the emails Gauzy would send', () => {
		const input = appointmentInputOf(
			{
				title: ' Sprint review ',
				description: '  ',
				start: new Date('2026-11-12T14:00:00.000Z'),
				durationMinutes: 45,
				link: 'https://app.example.com/meet/jitsi?room=abc&title=Sprint%20review'
			},
			'employee-1'
		);

		expect(input).toEqual({
			agenda: 'Sprint review',
			location: 'https://app.example.com/meet/jitsi?room=abc&title=Sprint%20review',
			startDateTime: '2026-11-12T14:00:00.000Z',
			endDateTime: '2026-11-12T14:45:00.000Z',
			employeeId: 'employee-1'
		});
		expect(input).not.toHaveProperty('emails');
	});

	it('writes a calendar file with the time in UTC, escaped text and folded long lines', () => {
		const ics = meetingIcsOf(
			meeting('m1', '2026-11-12T14:00:00.000Z', '2026-11-12T14:45:00.000Z', {
				title: 'Review; design, and plan',
				description: 'Agenda:\n1. Demo',
				link: `https://app.example.com/meet/jitsi?room=${'a'.repeat(80)}`
			}) as ScheduledMeeting & { link: string },
			new Date('2026-11-11T10:00:00.000Z')
		);
		const lines = ics.split('\r\n');

		expect(lines).toContain('DTSTART:20261112T140000Z');
		expect(lines).toContain('DTEND:20261112T144500Z');
		expect(lines).toContain('SUMMARY:Review\\; design\\, and plan');
		expect(ics).toContain('DESCRIPTION:Agenda:\\n1. Demo\\n\\nhttps://app.example.com');
		expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});

	it('keeps a location of free text from adding properties to the calendar file', () => {
		// Gauzy keeps the location as free text: line breaks in it must not start properties of their own
		const ics = meetingIcsOf(
			meeting('m1;X\r\nATTENDEE', '2026-11-12T14:00:00.000Z', '2026-11-12T14:45:00.000Z', {
				link: 'https://app.example.com/meet\r\nATTENDEE:mailto:eve@example.com\rORGANIZER:mailto:eve@example.com'
			}) as ScheduledMeeting & { link: string },
			new Date('2026-11-11T10:00:00.000Z')
		);
		const lines = ics.split('\r\n');

		expect(lines.some((line) => /^(ATTENDEE|ORGANIZER)/.test(line))).toBe(false);
		expect(ics).not.toMatch(/\r(?!\n)/);
		// Not a URL any more once it holds line breaks: no URL property at all
		expect(lines.some((line) => line.startsWith('URL:'))).toBe(false);
		expect(lines).toContain('UID:m1XATTENDEE@ever-teams');
	});

	it('writes the URL property only for an http(s) link', () => {
		const ics = (link: string) =>
			meetingIcsOf(
				meeting('m1', '2026-11-12T14:00:00.000Z', '2026-11-12T14:45:00.000Z', { link }) as ScheduledMeeting & {
					link: string;
				}
			);

		expect(ics('https://app.ever.team/meet/jitsi?room=abc')).toContain(
			'\r\nURL:https://app.ever.team/meet/jitsi?room=abc\r\n'
		);
		expect(ics('javascript:alert(1)')).not.toContain('URL:');
		expect(ics('Room 4, second floor')).not.toContain('URL:');
	});
});
