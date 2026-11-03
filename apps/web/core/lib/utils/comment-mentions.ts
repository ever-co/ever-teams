import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

/**
 * Comment mentions as the Gauzy UI writes them: plain text "@Full Name", plus the ids of the employees picked from
 * the menu whose "@Full Name" is still in the text when it is sent (`mentionEmployeeIds`, one notification each).
 */
export interface MentionablePerson {
	employeeId: string;
	name: string;
	imageUrl?: string | null;
}

export interface MentionQuery {
	start: number;
	query: string;
}

export interface MentionSegment {
	text: string;
	isMention: boolean;
}

export const MENTION_TRIGGER = '@';

const MENTION_SUGGESTION_LIMIT = 8;

/** Longer than any full name: past it the `@` is just a character of the text. */
const MENTION_QUERY_MAX_LENGTH = 40;

const WHITESPACE = /\s/;

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

function candidateOf(member: TOrganizationTeamEmployee): MentionablePerson | null {
	const employeeId = member.employeeId ?? member.employee?.id ?? '';
	const user = member.employee?.user;
	const fullName = member.employee?.fullName ?? user?.name ?? '';
	const name = fullName.trim();
	const isComplete = employeeId.length > 0 && name.length > 0;
	if (!isComplete) {
		return null;
	}
	return { employeeId, name, imageUrl: user?.imageUrl };
}

export function mentionCandidatesOf(members: TOrganizationTeamEmployee[]): MentionablePerson[] {
	const candidates = new Map<string, MentionablePerson>();
	for (const member of members) {
		const candidate = candidateOf(member);
		if (candidate) {
			candidates.set(candidate.employeeId, candidate);
		}
	}
	return [...candidates.values()];
}

export function mentionTextOf(candidate: MentionablePerson) {
	return `${MENTION_TRIGGER}${candidate.name}`;
}

/** The ids of the picked people whose mention is still in the text: deleting "@Name" un-notifies them. */
export function collectMentionEmployeeIds(text: string, picked: readonly MentionablePerson[]): string[] {
	const ids = new Set<string>();
	for (const candidate of picked) {
		const isStillMentioned = text.includes(mentionTextOf(candidate));
		if (isStillMentioned) {
			ids.add(candidate.employeeId);
		}
	}
	return [...ids];
}

/** The `@` being typed before the caret, when it starts a word: "mail@x" is an address, not a mention. */
export function mentionQueryBefore(text: string, caret: number): MentionQuery | null {
	const before = text.slice(0, caret);
	const start = before.lastIndexOf(MENTION_TRIGGER);
	if (start < 0) {
		return null;
	}
	const isAtTextStart = start === 0;
	const followsWhitespace = WHITESPACE.test(before[start - 1] ?? '');
	const startsAWord = isAtTextStart || followsWhitespace;
	if (!startsAWord) {
		return null;
	}
	const query = before.slice(start + MENTION_TRIGGER.length);
	const spansALine = query.includes('\n');
	const isTooLong = query.length > MENTION_QUERY_MAX_LENGTH;
	if (spansALine || isTooLong) {
		return null;
	}
	return { start, query };
}

export function filterMentionCandidates(candidates: MentionablePerson[], query: string): MentionablePerson[] {
	const normalizedQuery = query.trim().toLowerCase();
	const matches = candidates.filter((candidate) => candidate.name.toLowerCase().includes(normalizedQuery));
	return matches.slice(0, MENTION_SUGGESTION_LIMIT);
}

function escapeForRegExp(text: string) {
	return text.replace(REGEX_SPECIAL_CHARACTERS, String.raw`\$&`);
}

function mentionPatternOf(names: string[]) {
	const usableNames = names.filter((name) => name.length > 0);
	if (usableNames.length === 0) {
		return null;
	}
	const longestFirst = [...usableNames].sort((first, second) => second.length - first.length);
	const alternatives = longestFirst.map(escapeForRegExp).join('|');
	return new RegExp(String.raw`(?<=^|\s)${MENTION_TRIGGER}(?:${alternatives})`, 'g');
}

/** The text cut around the "@Full Name" of known people, so a view can draw each mention as a chip. */
export function splitMentions(text: string, names: string[]): MentionSegment[] {
	const pattern = mentionPatternOf(names);
	if (!pattern) {
		return [{ text, isMention: false }];
	}
	const segments: MentionSegment[] = [];
	let cursor = 0;
	for (const match of text.matchAll(pattern)) {
		const matchStart = match.index ?? 0;
		if (matchStart > cursor) {
			segments.push({ text: text.slice(cursor, matchStart), isMention: false });
		}
		segments.push({ text: match[0], isMention: true });
		cursor = matchStart + match[0].length;
	}
	if (cursor < text.length) {
		segments.push({ text: text.slice(cursor), isMention: false });
	}
	return segments;
}
