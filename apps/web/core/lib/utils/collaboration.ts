import capitalize from 'lodash/capitalize';
import { readRuntimeEnv } from '@/env-config';

export type CollaborationMode = 'meeting' | 'board';

/** Jitsi unless the deployment chose LiveKit, read at runtime so one Docker image serves both. */
export function isJitsiMeeting(): boolean {
	const meetType = readRuntimeEnv('NEXT_PUBLIC_MEET_TYPE') || process.env.NEXT_PUBLIC_MEET_TYPE || 'Jitsi';

	return meetType.toLowerCase() === 'jitsi';
}

export interface CollaborationPerson {
	id: string;
	name: string;
}

function firstNameOf(person: CollaborationPerson): string {
	const words = person.name.trim().split(/\s+/);

	return words[0] ?? '';
}

function pascalTeamName(teamName: string): string {
	const words = teamName.trim().split(/\s+/);

	return words.map((word) => capitalize(word)).join('');
}

/**
 * The room's name, readable in the meeting header: the team, the first names of the people in it, then a random
 * suffix so two meetings of the same people never share a room.
 */
export function meetRoomNameFor(
	teamName: string | null | undefined,
	people: readonly CollaborationPerson[],
	suffix: string
): string {
	if (!teamName) {
		return suffix;
	}
	const firstNames = people.map(firstNameOf).filter((name) => name.length > 0);
	const parts = [pascalTeamName(teamName), ...firstNames, suffix];

	return parts.join('-');
}

/** Base64 of the UTF-8 bytes, as the meeting pages decode it (`atob`). */
export function encodeRoomName(roomName: string): string {
	const bytes = new TextEncoder().encode(roomName);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

/** The in-app meeting page for a room; Jitsi and LiveKit read the room from different parameters. */
export function meetPathFor(roomName: string, isJitsi: boolean): string {
	const encoded = encodeURIComponent(encodeRoomName(roomName));
	if (isJitsi) {
		return `/meet/jitsi?room=${encoded}`;
	}

	return `/meet/livekit?roomName=${encoded}`;
}

/**
 * Where the whiteboard opens: the external board app in live mode with the picked people when one is configured,
 * otherwise the in-app board.
 */
export function boardTargetFor(
	memberIds: readonly string[],
	boardAppDomain: string | null | undefined
): { href: string; isExternal: boolean } {
	const hasPeople = memberIds.length > 0;
	if (!hasPeople || !boardAppDomain) {
		return { href: '/board', isExternal: false };
	}
	const url = new URL(boardAppDomain);
	url.searchParams.set('live', 'true');
	url.searchParams.set('members', btoa(memberIds.join(',')));

	return { href: url.toString(), isExternal: true };
}
