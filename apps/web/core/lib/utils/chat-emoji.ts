/**
 * The composer's emoji autocomplete: `:` and a few letters of a short name (`:thu`) offer the emoji whose name starts
 * with them (👍 for `:thumbsup:`), from the dataset the emoji picker already ships.
 */

/** One emoji the autocomplete can offer: its short name, the words it is also found by, and the character. */
export interface ChatEmojiEntry {
	id: string;
	native: string;
	/** The short name and its aliases, lower case (`thumbsup`, `+1`). */
	names: string[];
	/** The dataset's keywords and the words of its name, lower case. */
	keywords: string[];
}

/** The parts of the picker's dataset (`@emoji-mart/data`) the index is built from. */
export interface ChatEmojiDataset {
	categories?: Array<{ id: string; emojis: string[] }>;
	emojis: Record<string, { id: string; name?: string; keywords?: string[]; skins?: Array<{ native?: string }> }>;
	aliases?: Record<string, string>;
}

/** How many letters after the `:` open the suggestions: one would offer half the dataset. */
export const EMOJI_QUERY_MIN = 2;

/** The characters of a short name (`thumbsup`, `+1`, `flag-fr`). */
const SHORT_NAME = /^[a-z0-9_+-]+$/;

/** A fence line: up to three spaces, then three or more backticks or tildes (what opens or closes a code block). */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/**
 * Whether the caret sits inside code, where text is literal: an open fenced block (``` or ~~~, closed by a fence of
 * the same character at least as long, with nothing after it), or on the current line a code span opened by a run of
 * backticks that no run of the same length has closed yet (a run of another length inside it is part of the code).
 */
export function isInsideCode(before: string): boolean {
	const lines = before.split('\n');
	let fence: string | null = null;
	for (let index = 0; index < lines.length - 1; index += 1) {
		const match = FENCE.exec(lines[index]);
		if (!fence) {
			if (match) fence = match[1];
			continue;
		}
		const closes = !!match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim();
		if (closes) fence = null;
	}
	const current = lines[lines.length - 1];
	if (fence || FENCE.test(current)) return true;
	let open = 0;
	for (const run of current.match(/`+/g) ?? []) {
		if (!open) open = run.length;
		else if (run.length === open) open = 0;
	}
	return open > 0;
}

/**
 * The emoji query under the caret: a `:` at the start of the text or after a space (not the `:` of `10:30` or of a
 * link), then at least two letters of a short name, up to the caret. Null inside code, or once the name is closed
 * (`:tada:`).
 */
export function emojiQueryAt(text: string, caret: number): { query: string; start: number } | null {
	const before = text.slice(0, caret);
	const match = /(^|[\s([{])(:([a-z0-9_+-]*))$/i.exec(before);
	if (!match) return null;
	const query = match[3].toLowerCase();
	if (query.length < EMOJI_QUERY_MIN || !SHORT_NAME.test(query)) return null;
	if (isInsideCode(before)) return null;
	return { query, start: caret - match[2].length };
}

function wordsOf(text: string): string[] {
	return text
		.toLowerCase()
		.split(/[^a-z0-9+]+/)
		.filter(Boolean);
}

/**
 * The dataset as a list for the autocomplete, in the picker's order (its categories: smileys and people first), so
 * the usual emoji come before rare ones of the same rank. An emoji without a character is left out.
 */
export function buildEmojiIndex(data: ChatEmojiDataset): ChatEmojiEntry[] {
	const aliasesOf = new Map<string, string[]>();
	for (const [alias, id] of Object.entries(data.aliases ?? {}))
		aliasesOf.set(id, [...(aliasesOf.get(id) ?? []), alias.toLowerCase()]);
	const ordered: string[] = [];
	const seen = new Set<string>();
	for (const category of data.categories ?? []) {
		for (const id of category.emojis) {
			if (seen.has(id)) continue;
			seen.add(id);
			ordered.push(id);
		}
	}
	for (const id of Object.keys(data.emojis)) {
		if (seen.has(id)) continue;
		seen.add(id);
		ordered.push(id);
	}
	const entries: ChatEmojiEntry[] = [];
	for (const id of ordered) {
		const emoji = data.emojis[id];
		const native = emoji?.skins?.[0]?.native;
		if (!emoji || !native) continue;
		const keywords = new Set([...(emoji.keywords ?? []).flatMap(wordsOf), ...wordsOf(emoji.name ?? '')]);
		entries.push({
			id: emoji.id.toLowerCase(),
			native,
			names: [emoji.id.toLowerCase(), ...(aliasesOf.get(id) ?? [])],
			keywords: [...keywords]
		});
	}
	return entries;
}

/**
 * How well an entry answers a query, lower first; null when it does not. A short name that is the query comes first,
 * then one that starts with it, then one with a part that starts with it (`:up` finds `thumbsup` after `upside_down`),
 * then a keyword that starts with it.
 */
function rankOf(entry: ChatEmojiEntry, query: string): number | null {
	if (entry.names.includes(query)) return 0;
	if (entry.names.some((name) => name.startsWith(query))) return 1;
	if (entry.names.some((name) => name.split(/[_-]/).some((part) => part.startsWith(query)))) return 2;
	if (entry.keywords.some((keyword) => keyword.startsWith(query))) return 3;
	return null;
}

/** The emoji a query offers, best first and in the dataset's order within a rank, a few at most. */
export function suggestEmojis(index: readonly ChatEmojiEntry[], query: string, limit = 8): ChatEmojiEntry[] {
	const needle = query.trim().toLowerCase();
	if (needle.length < EMOJI_QUERY_MIN) return [];
	const ranked: Array<{ entry: ChatEmojiEntry; rank: number; order: number }> = [];
	index.forEach((entry, order) => {
		const rank = rankOf(entry, needle);
		if (rank !== null) ranked.push({ entry, rank, order });
	});
	return ranked
		.sort((a, b) => a.rank - b.rank || a.order - b.order)
		.slice(0, limit)
		.map((item) => item.entry);
}
