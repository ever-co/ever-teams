import { isEmail } from 'class-validator';

/**
 * What happens to an address once the invitations are sent: a new invitation, a fresh email for an invitation
 * that is still pending, nothing for a member of the team, or nothing because it is not an address.
 */
export type InviteEmailState = 'new' | 'pending' | 'member' | 'invalid';

export interface InviteEmailEntry {
	email: string;
	state: InviteEmailState;
	/** The pending invitation to send again, for a `pending` address. */
	invitationId: string | null;
}

export interface InviteEmailContext {
	memberEmails: ReadonlySet<string>;
	/** Pending invitation id by address. */
	pendingInvitations: ReadonlyMap<string, string>;
}

const SEPARATORS = /[\s,;]+/;

/** Addresses as people type or paste them: one per comma, semicolon, space or line, lowercased, without repeats. */
export function splitEmailInput(text: string): string[] {
	const parts = text.split(SEPARATORS);
	const addresses: string[] = [];
	for (const part of parts) {
		const address = normalizeEmail(part);
		if (address.length === 0) {
			continue;
		}
		if (addresses.includes(address)) {
			continue;
		}
		addresses.push(address);
	}

	return addresses;
}

// Matches from the start of a token only, so a long token is scanned once instead of once per character.
const EMBEDDED_ADDRESS = /(?<![^\s,;<>"'()])[^\s,;<>"'()][^\s,;<>"'()@]*@[^\s,;<>"'()]+/g;

/**
 * The addresses inside pasted text, so a list copied from a mail client ("Ana Silva <ana@acme.com>, ...") gives
 * its addresses and not the names around them. Text without any "@" is split like typed input.
 */
export function extractEmails(text: string): string[] {
	const hasAddress = text.includes('@');
	if (!hasAddress) {
		return splitEmailInput(text);
	}
	const found = text.match(EMBEDDED_ADDRESS) ?? [];

	return splitEmailInput(found.join(' '));
}

export function normalizeEmail(value: string): string {
	return value.trim().replace(/^<|>$/g, '').toLowerCase();
}

export function classifyInviteEmail(email: string, context: InviteEmailContext): InviteEmailEntry {
	if (!isEmail(email)) {
		return { email, state: 'invalid', invitationId: null };
	}
	if (context.memberEmails.has(email)) {
		return { email, state: 'member', invitationId: null };
	}
	const invitationId = context.pendingInvitations.get(email);
	if (invitationId) {
		return { email, state: 'pending', invitationId };
	}

	return { email, state: 'new', invitationId: null };
}

/** The addresses that leave with the request: new ones go in one invitation, pending ones are sent again. */
export function sendableEntries(entries: readonly InviteEmailEntry[]): InviteEmailEntry[] {
	return entries.filter((entry) => entry.state === 'new' || entry.state === 'pending');
}

/** Appends addresses, keeping the first occurrence of each. */
export function mergeEmails(current: readonly string[], added: readonly string[]): string[] {
	const merged = [...current];
	for (const address of added) {
		if (merged.includes(address)) {
			continue;
		}
		merged.push(address);
	}

	return merged;
}
