// cspell:ignore DTEND DTSTART VCALENDAR XATTENDEE Équipe
import { meetPathFor } from './collaboration';
import {
	appointmentInputOf,
	appointmentUpdateOf,
	dayAfter,
	isRoomTokenStale,
	meetingDaysOf,
	meetingIcsOf,
	meetingInviteesOf,
	meetingLinkWithTitle,
	meetingPathFor,
	meetingPathOfInput,
	meetingsOfDay,
	isSharingScreenAsked,
	meetingTitleOf,
	participantsWithText,
	roomNameOfParam,
	scheduledMeetingOf,
	scheduledMeetingStateOf,
	searchWithoutSharing,
	sharingScreenPathOf,
	startOfDay,
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

	it('asks for a new room token once the one in hand waited more than a quarter of an hour', () => {
		const issuedAt = new Date('2026-11-11T10:00:00Z').getTime();

		expect(isRoomTokenStale(issuedAt, issuedAt + 14 * 60_000)).toBe(false);
		expect(isRoomTokenStale(issuedAt, issuedAt + 16 * 60_000)).toBe(true);
		// No token yet: the room waits for the one on its way
		expect(isRoomTokenStale(null, issuedAt + 60 * 60_000)).toBe(false);
	});

	// Across a change of the clock: meetings-agenda-dst.test.ts, in an environment with daylight saving

	it('lists the meetings of one day by start time, its ended ones kept and one running past midnight on both days', () => {
		const meetings = [
			meeting('next-week', '2026-11-19T09:00:00', '2026-11-19T10:00:00'),
			meeting('tomorrow', '2026-11-12T09:00:00', '2026-11-12T09:30:00'),
			meeting('this-morning', '2026-11-11T08:00:00', '2026-11-11T08:30:00'),
			meeting('yesterday', '2026-11-10T09:00:00', '2026-11-10T10:00:00'),
			meeting('overnight', '2026-11-10T23:00:00', '2026-11-11T01:00:00'),
			meeting('later-today', '2026-11-11T15:00:00', '2026-11-11T16:00:00'),
			meeting('until-midnight', '2026-11-11T23:00:00', '2026-11-12T00:00:00')
		];
		const idsOf = (day: Date) => meetingsOfDay(meetings, day).map(({ id }) => id);

		expect(idsOf(now)).toEqual(['overnight', 'this-morning', 'later-today', 'until-midnight']);
		expect(idsOf(dayAfter(now, -1))).toEqual(['yesterday', 'overnight']);
		expect(idsOf(dayAfter(now, 1))).toEqual(['tomorrow']);
		expect(idsOf(dayAfter(now, 2))).toEqual([]);
		expect(dayAfter(now, 8)).toEqual(new Date('2026-11-19T00:00:00'));
		expect(startOfDay(now)).toEqual(new Date('2026-11-11T00:00:00'));
	});

	it('marks the days a meeting runs on, not the one its midnight end opens, and a month at most', () => {
		const daysOf = (meetings: ScheduledMeeting[]) =>
			[...meetingDaysOf(meetings)].map((day) => new Date(day).toISOString().slice(0, 10)).sort();
		const localDay = (date: string) => new Date(`${date}T00:00:00`).toISOString().slice(0, 10);

		expect(
			daysOf([
				meeting('overnight', '2026-11-10T23:00:00', '2026-11-11T01:00:00'),
				meeting('until-midnight', '2026-11-12T23:00:00', '2026-11-13T00:00:00'),
				meeting('same-day', '2026-11-10T09:00:00', '2026-11-10T10:00:00')
			])
		).toEqual([localDay('2026-11-10'), localDay('2026-11-11'), localDay('2026-11-12')]);
		expect(meetingDaysOf([meeting('typo', '2026-11-10T09:00:00', '2036-11-10T10:00:00')]).size).toBe(31);
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

	it("sends the participants' addresses as the appointment's emails, which Gauzy splits on a comma and a space", () => {
		const input = appointmentInputOf(
			{
				title: 'Sprint review',
				start: new Date('2026-11-12T14:00:00.000Z'),
				durationMinutes: 30,
				link: 'https://app.example.com/meet/jitsi?room=abc',
				participantEmails: ['ana@acme.com', 'bob@example.org']
			},
			'employee-1'
		);

		expect(input.emails).toBe('ana@acme.com, bob@example.org');
		expect(input.emails?.split(', ')).toEqual(['ana@acme.com', 'bob@example.org']);
	});

	it('offers the team members with an address, by name, once each and without oneself', () => {
		const member = (email: string | null, name?: string, fullName?: string) => ({
			employee: { fullName, user: { email, name } }
		});

		expect(
			meetingInviteesOf(
				[
					member('Zoe@Acme.com', 'Zoe Martin'),
					member('me@acme.com', 'Me'),
					member(null, 'No address'),
					member('ana@acme.com', '', 'Ana Silva'),
					member('zoe@acme.com', 'Zoe again'),
					{ employee: null }
				],
				'ME@acme.com'
			)
		).toEqual([
			{ email: 'ana@acme.com', name: 'Ana Silva' },
			{ email: 'zoe@acme.com', name: 'Zoe Martin' }
		]);
	});

	it('adds the addresses typed or pasted as participants, once each, and tells what was no address', () => {
		expect(participantsWithText(['ana@acme.com'], 'Bob <BOB@example.org>, ana@acme.com')).toEqual({
			emails: ['ana@acme.com', 'bob@example.org'],
			rejected: []
		});
		expect(participantsWithText([], 'bob@example.org, ana@example')).toEqual({
			emails: ['bob@example.org'],
			rejected: ['ana@example']
		});
		expect(participantsWithText(['bob@example.org'], 'ana')).toEqual({
			emails: ['bob@example.org'],
			rejected: ['ana']
		});
	});

	it('reschedules a meeting with its title, time and link only, so Gauzy keeps the rest', () => {
		const start = new Date('2026-11-13T09:30:00.000Z');
		const link = 'https://app.example.com/meet/jitsi?room=abc&title=Sprint%20review';

		expect(appointmentUpdateOf({ title: ' Sprint demo ', start, durationMinutes: 60, link })).toEqual({
			agenda: 'Sprint demo',
			startDateTime: '2026-11-13T09:30:00.000Z',
			endDateTime: '2026-11-13T10:30:00.000Z',
			location: link
		});
		expect(appointmentUpdateOf({ title: 'Call', start, durationMinutes: 15, link: null })).not.toHaveProperty(
			'location'
		);
	});

	it("renames a meeting's link and keeps its room as written", () => {
		const room = 'room+one/two=';

		expect(
			meetingLinkWithTitle(`https://app.example.com/meet/jitsi?room=${room}&title=Sprint%20review`, 'Demo & Q&A')
		).toBe(`https://app.example.com/meet/jitsi?room=${room}&title=Demo%20%26%20Q%26A`);
		expect(meetingLinkWithTitle(`https://app.example.com/meet/livekit?roomName=${room}`, 'Retro')).toBe(
			`https://app.example.com/meet/livekit?roomName=${room}&title=Retro`
		);
	});

	it("keeps a meeting link's fragment after its query when the meeting is renamed", () => {
		expect(meetingLinkWithTitle('https://app.example.com/meet/jitsi?room=abc&title=Old#notes', 'New')).toBe(
			'https://app.example.com/meet/jitsi?room=abc&title=New#notes'
		);
		expect(meetingLinkWithTitle('https://app.example.com/meet/jitsi?room=abc#notes', 'New')).toBe(
			'https://app.example.com/meet/jitsi?room=abc&title=New#notes'
		);
	});

	it('leaves a location that is no meeting link as written when the meeting is renamed', () => {
		expect(meetingLinkWithTitle('Office', 'Retro')).toBe('Office');
		expect(meetingLinkWithTitle('https://zoom.us/j/123?pwd=abc', 'Retro')).toBe('https://zoom.us/j/123?pwd=abc');
	});

	it('asks a meeting page to share the screen, and takes the request out of its address as written', () => {
		const path = sharingScreenPathOf('/meet/jitsi?room=room+one/two=');

		expect(path).toBe('/meet/jitsi?room=room+one/two=&share=screen');
		expect(isSharingScreenAsked(path.split('?')[1])).toBe(true);
		expect(isSharingScreenAsked('?room=abc&share=screens')).toBe(false);
		expect(searchWithoutSharing('?room=room+one/two=&share=screen&title=Demo%20day')).toBe(
			'?room=room+one/two=&title=Demo%20day'
		);
		expect(searchWithoutSharing('?share=screen')).toBe('');
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
