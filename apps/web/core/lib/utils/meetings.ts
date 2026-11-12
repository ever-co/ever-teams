import { isEmail } from 'class-validator';
import { meetPathFor } from './collaboration';
import { extractEmails, mergeEmails } from './invite-emails';

/** The meeting pages, with or without the locale prefix of a non-default language (/fr/meet/jitsi). */
const MEET_ROOM_PATH = /(?:^|\/)meet\/(jitsi|livekit)\/?$/;
/** A room name typed by hand: letters, digits, dashes and underscores, as the names Ever Teams makes. */
const TYPED_ROOM_NAME = /^[\p{L}\p{N}_-]{3,200}$/u;
const BASE64 = /^[A-Za-z0-9+/=]+$/;
/** `meetRoomNameFor` ends a room's name with a dash and a random suffix of this length. */
const ROOM_SUFFIX_LENGTH = 10;
const TITLE_MAX_LENGTH = 120;
const MINUTE = 60_000;

/** A meeting opens this many minutes before its start, as people tend to arrive early. */
export const JOIN_EARLY_MINUTES = 10;

/** A room token older than this is asked for again before the room opens: the meeting servers' tokens last an hour. */
const TOKEN_FRESH_MINUTES = 15;

/**
 * Whether the token in hand, issued at `issuedAt`, is too old to open a room with: a person can stay long on the
 * pre-join screen, or come back in after a long meeting. No token yet is not stale: the room waits for it anyway.
 */
export function isRoomTokenStale(issuedAt: number | null, now: number): boolean {
	return issuedAt !== null && now - issuedAt > TOKEN_FRESH_MINUTES * MINUTE;
}

/** The room a meeting link carries (base64 of its UTF-8 name), or null when it is not one. */
export function roomNameOfParam(param: string | null | undefined): string | null {
	// Links carry the room unencoded, so a base64 "+" arrives as a space (base64 has no spaces)
	const encoded = param?.trim().replace(/ /g, '+');
	if (!encoded || !BASE64.test(encoded)) {
		return null;
	}
	try {
		const binary = atob(encoded);
		const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
		const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
		return name.trim() ? name : null;
	} catch {
		return null;
	}
}

function withTitle(path: string, title: string | null | undefined): string {
	const shownTitle = title?.trim().slice(0, TITLE_MAX_LENGTH);
	if (!shownTitle) {
		return path;
	}
	return `${path}&title=${encodeURIComponent(shownTitle)}`;
}

/** The in-app meeting page for a room, with the title its header shows when one is known. */
export function meetingPathFor(roomName: string, isJitsi: boolean, title?: string | null): string {
	return withTitle(meetPathFor(roomName, isJitsi), title);
}

/** The part of a meeting page's address that asks it to share the screen once the room is joined. */
const SHARE_SCREEN_PARAM = 'share=screen';

/** The meeting page of a meeting started to show the screen. */
export function sharingScreenPathOf(path: string): string {
	return `${path}&${SHARE_SCREEN_PARAM}`;
}

/** Whether a meeting page's query asks it to share the screen once joined. */
export function isSharingScreenAsked(search: string): boolean {
	return search.replace(/^\?/, '').split('&').includes(SHARE_SCREEN_PARAM);
}

/**
 * A meeting page's query without the request to share the screen, the rest kept as written: the address is the link
 * people copy, and it must not ask someone else's browser to share.
 */
export function searchWithoutSharing(search: string): string {
	const kept = search
		.replace(/^\?/, '')
		.split('&')
		.filter((part) => part && part !== SHARE_SCREEN_PARAM);
	return kept.length > 0 ? `?${kept.join('&')}` : '';
}

/**
 * Where a pasted meeting link or a typed room name leads in this app: `undefined` when the text is no meeting link,
 * `null` when it is one without a valid room. The room opens on this deployment's meeting server, whichever server
 * the link was made for: the room is in the link, the server is not.
 */
function pathOfMeetingLink(text: string, isJitsi: boolean): string | null | undefined {
	let url: URL;
	try {
		url = new URL(text, 'https://link.invalid');
	} catch {
		return undefined;
	}
	const match = MEET_ROOM_PATH.exec(url.pathname);
	if (!match) {
		return undefined;
	}
	const param = match[1] === 'jitsi' ? 'room' : 'roomName';
	const roomName = roomNameOfParam(url.searchParams.get(param));
	if (!roomName) {
		return null;
	}
	return meetingPathFor(roomName, isJitsi, url.searchParams.get('title'));
}

/** The meeting page a pasted link or a typed room name opens, or null when the text is neither. */
export function meetingPathOfInput(input: string, isJitsi: boolean): string | null {
	const text = input.trim();
	if (!text) {
		return null;
	}
	const linkPath = pathOfMeetingLink(text, isJitsi);
	if (linkPath !== undefined) {
		return linkPath;
	}
	return TYPED_ROOM_NAME.test(text) ? meetingPathFor(text, isJitsi) : null;
}

/**
 * The title a meeting shows: the one its link names, else the team and the people its room was named after
 * (`Team-First-Second-<suffix>`, see `meetRoomNameFor`), else null for a room with a random name only.
 */
export function meetingTitleOf(roomName: string, linkTitle?: string | null): string | null {
	const title = linkTitle?.trim();
	if (title) {
		return title.slice(0, TITLE_MAX_LENGTH);
	}
	const suffixStart = roomName.length - ROOM_SUFFIX_LENGTH - 1;
	const hasSuffix = suffixStart > 0 && roomName[suffixStart] === '-';
	if (!hasSuffix) {
		return null;
	}
	const [team, ...people] = roomName.slice(0, suffixStart).split('-').filter(Boolean);
	if (!team) {
		return null;
	}
	return people.length > 0 ? `${team} · ${people.join(', ')}` : team;
}

/** A meeting scheduled in Ever Gauzy (an employee appointment whose location is the meeting link). */
export interface ScheduledMeeting {
	id: string;
	title: string;
	description: string | null;
	start: Date;
	end: Date;
	link: string | null;
}

/** Where a scheduled meeting stands: running, open to join soon, later, or over. */
export type ScheduledMeetingState = 'live' | 'soon' | 'later' | 'ended';

export function scheduledMeetingStateOf(meeting: ScheduledMeeting, now: Date): ScheduledMeetingState {
	const time = now.getTime();
	if (time >= meeting.end.getTime()) {
		return 'ended';
	}
	if (time >= meeting.start.getTime()) {
		return 'live';
	}
	const opensAt = meeting.start.getTime() - JOIN_EARLY_MINUTES * MINUTE;
	return time >= opensAt ? 'soon' : 'later';
}

/** Midnight of a date's day, local time. */
export function startOfDay(date: Date): Date {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	return day;
}

/** Midnight of the day so many calendar days away: a day that changes the clock is 23 or 25 hours long, not 24. */
export function dayAfter(day: Date, days: number): Date {
	const next = startOfDay(day);
	next.setDate(next.getDate() + days);
	return next;
}

/** A calendar marks at most this many days for one meeting, so a mistyped end years away costs nothing. */
const MARKED_DAYS_PER_MEETING = 31;

/** The days some meeting runs on (their midnight, in milliseconds), for a calendar to mark them. */
export function meetingDaysOf(meetings: readonly ScheduledMeeting[]): Set<number> {
	const days = new Set<number>();
	for (const meeting of meetings) {
		// A meeting that ends at midnight does not run on the day that starts then
		const lastMoment = Math.max(meeting.start.getTime(), meeting.end.getTime() - 1);
		let day = startOfDay(meeting.start);
		for (let count = 0; count < MARKED_DAYS_PER_MEETING && day.getTime() <= lastMoment; count += 1) {
			days.add(day.getTime());
			day = dayAfter(day, 1);
		}
	}
	return days;
}

/**
 * The meetings of one day, by start time: every meeting that runs some time that day, so one that began the evening
 * before and runs on past midnight shows on both days, and the ended ones stay, so the day reads as it went.
 */
export function meetingsOfDay(meetings: readonly ScheduledMeeting[], day: Date): ScheduledMeeting[] {
	const dayStart = startOfDay(day).getTime();
	const dayEnd = dayAfter(day, 1).getTime();
	return meetings
		.filter((meeting) => meeting.start.getTime() < dayEnd && meeting.end.getTime() > dayStart)
		.sort((first, second) => first.start.getTime() - second.start.getTime());
}

/** An employee appointment as Ever Gauzy returns it; only the fields a meeting needs. */
export interface MeetingAppointment {
	id: string;
	agenda?: string | null;
	description?: string | null;
	location?: string | null;
	startDateTime?: string | Date | null;
	endDateTime?: string | Date | null;
	status?: string | null;
}

/** The scheduled meeting an appointment holds, or null when its times are missing or it was cancelled. */
export function scheduledMeetingOf(appointment: MeetingAppointment): ScheduledMeeting | null {
	const start = appointment.startDateTime ? new Date(appointment.startDateTime) : null;
	const end = appointment.endDateTime ? new Date(appointment.endDateTime) : null;
	const hasTimes = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
	const isCancelled = appointment.status?.toLowerCase() === 'cancelled';
	if (!hasTimes || isCancelled) {
		return null;
	}
	return {
		id: appointment.id,
		title: appointment.agenda?.trim() || '',
		description: appointment.description?.trim() || null,
		start,
		end,
		link: appointment.location?.trim() || null
	};
}

export interface ScheduleMeetingDraft {
	title: string;
	description?: string;
	start: Date;
	durationMinutes: number;
	/** The full link of the meeting page. */
	link: string;
	/** The addresses of the people invited: team members and others. */
	participantEmails?: string[];
}

export interface MeetingAppointmentInput {
	agenda: string;
	description?: string;
	location: string;
	startDateTime: string;
	endDateTime: string;
	employeeId: string;
	/** The invitees' addresses, as Gauzy reads them: one string, the addresses separated by a comma and a space. */
	emails?: string;
}

/**
 * The appointment Ever Gauzy stores for a scheduled meeting, owned by the person who schedules it. The people invited
 * go in its `emails`, which Gauzy splits on ", " to send each a short "new appointment" message; that message carries
 * neither the time nor the link, so the confirmation still gives the invitation to copy and the calendar file.
 */
export function appointmentInputOf(draft: ScheduleMeetingDraft, employeeId: string): MeetingAppointmentInput {
	const end = new Date(draft.start.getTime() + draft.durationMinutes * MINUTE);
	const description = draft.description?.trim();
	const emails = draft.participantEmails ?? [];
	return {
		agenda: draft.title.trim(),
		...(description ? { description } : {}),
		location: draft.link,
		startDateTime: draft.start.toISOString(),
		endDateTime: end.toISOString(),
		employeeId,
		...(emails.length > 0 ? { emails: emails.join(', ') } : {})
	};
}

/** A team member one can invite to a meeting. */
export interface MeetingInvitee {
	email: string;
	name: string;
}

/** The parts of a team member the invitation needs. */
interface InvitableMember {
	employee?: {
		fullName?: string | null;
		user?: { email?: string | null; name?: string | null } | null;
	} | null;
}

/** The team members one can invite, by name: everyone with an address but oneself, each once. */
export function meetingInviteesOf(members: readonly InvitableMember[], ownEmail?: string | null): MeetingInvitee[] {
	const own = ownEmail?.trim().toLowerCase();
	const byEmail = new Map<string, MeetingInvitee>();
	for (const member of members) {
		const email = member.employee?.user?.email?.trim().toLowerCase();
		if (!email || email === own || byEmail.has(email)) {
			continue;
		}
		const name = member.employee?.user?.name?.trim() || member.employee?.fullName?.trim() || email;
		byEmail.set(email, { email, name });
	}
	return [...byEmail.values()].sort((first, second) => first.name.localeCompare(second.name));
}

/**
 * The addresses typed or pasted into the participants ("Ana <ana@acme.com>, bob@acme.com" gives both), added to
 * those already there, and what was not an address, to say so.
 */
export function participantsWithText(
	current: readonly string[],
	text: string
): { emails: string[]; rejected: string[] } {
	const found = extractEmails(text);
	const valid = found.filter((address) => isEmail(address));
	return { emails: mergeEmails(current, valid), rejected: found.filter((address) => !isEmail(address)) };
}

/** A meeting moved to another time, or renamed. */
export interface RescheduleMeetingDraft {
	title: string;
	start: Date;
	durationMinutes: number;
	/** The meeting's link, its title brought up to date; null for a meeting without a link. */
	link: string | null;
}

export interface MeetingAppointmentUpdate {
	agenda: string;
	startDateTime: string;
	endDateTime: string;
	location?: string;
}

/**
 * What Gauzy's appointment update (`PUT /employee-appointment/:id`) takes to reschedule a meeting: its title, its time
 * and its link. Gauzy leaves alone what an update does not carry, so the description and the emails stay as they were.
 */
export function appointmentUpdateOf(draft: RescheduleMeetingDraft): MeetingAppointmentUpdate {
	const end = new Date(draft.start.getTime() + draft.durationMinutes * MINUTE);
	return {
		agenda: draft.title.trim(),
		startDateTime: draft.start.toISOString(),
		endDateTime: end.toISOString(),
		...(draft.link ? { location: draft.link } : {})
	};
}

/**
 * A meeting's link under a new title, its room kept as written: the links Ever Teams makes end with the title. Any
 * other location (an office, another app's link) is no meeting page and stays as written.
 */
export function meetingLinkWithTitle(link: string, title: string): string {
	if (pathOfMeetingLink(link, true) === undefined) {
		return link;
	}
	return withTitle(link.replace(/&title=[^&#]*/, ''), title);
}

// iCalendar (RFC 5545) property names
// cspell:ignore CALSCALE DTEND DTSTAMP DTSTART PRODID VCALENDAR VEVENT
function icsDateOf(date: Date): string {
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

/** A C0 control character or DEL: a line break, a tab, or anything else that has no place in a property line. */
function isControlCharacter(character: string): boolean {
	const code = character.codePointAt(0) ?? 0;
	return code < 0x20 || code === 0x7f;
}

/**
 * An iCalendar TEXT value: escaped, every line break (CR, LF or both) written as `\n`, and no other control
 * character, so no value can end its line and start a property of its own.
 */
function icsTextOf(value: string): string {
	const escaped = value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, String.raw`\;`)
		.replace(/,/g, String.raw`\,`)
		.replace(/\r\n|\r|\n/g, String.raw`\n`);
	return Array.from(escaped)
		.filter((character) => !isControlCharacter(character))
		.join('');
}

/**
 * The meeting's link as an iCalendar URI value, or null: Gauzy keeps the location as free text, and only an http(s)
 * URL with no space or control character goes into a property written as it is.
 */
function icsUriOf(link: string): string | null {
	const hasBreak = Array.from(link).some((character) => isControlCharacter(character) || /\s/.test(character));
	if (hasBreak) {
		return null;
	}
	try {
		const url = new URL(link);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch {
		return null;
	}
}

/** RFC 5545 folds a line longer than 75 octets: the rest goes on lines that start with a space. */
function foldIcsLine(line: string): string {
	const encoder = new TextEncoder();
	if (encoder.encode(line).length <= 75) {
		return line;
	}
	const parts: string[] = [];
	let current = '';
	for (const character of line) {
		const limit = parts.length === 0 ? 75 : 74;
		if (encoder.encode(current + character).length > limit) {
			parts.push(current);
			current = character;
		} else {
			current += character;
		}
	}
	parts.push(current);
	return parts.join('\r\n ');
}

/** A calendar file (iCalendar) of a meeting, to add it to one's own calendar or to send it to the people invited. */
export function meetingIcsOf(meeting: ScheduledMeeting & { link: string }, now: Date = new Date()): string {
	const description = [meeting.description, meeting.link].filter(Boolean).join('\n\n');
	const uri = icsUriOf(meeting.link);
	// The id comes from Gauzy; the UID keeps its letters, digits and dashes only
	const uid = meeting.id.replace(/[^\w-]/g, '');
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Ever Teams//Meetings//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${uid}@ever-teams`,
		`DTSTAMP:${icsDateOf(now)}`,
		`DTSTART:${icsDateOf(meeting.start)}`,
		`DTEND:${icsDateOf(meeting.end)}`,
		`SUMMARY:${icsTextOf(meeting.title)}`,
		`DESCRIPTION:${icsTextOf(description)}`,
		`LOCATION:${icsTextOf(meeting.link)}`,
		...(uri ? [`URL:${uri}`] : []),
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
