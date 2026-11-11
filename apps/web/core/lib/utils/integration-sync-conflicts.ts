import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import type { IIntegrationConflictQuery } from '@/core/types/interfaces/integrations/integration-sync-conflict';

/**
 * Helpers of the integrations' sync conflict list (Linear, Asana, Trello): the list's query string, how a stored value
 * is shown, and what a refused resolve means.
 */

/** The conflict list's query string (`?status=…&runId=…&take=…`), only with the filters given; empty without any. */
export function conflictQueryString(query: IIntegrationConflictQuery = {}): string {
	const params = new URLSearchParams();
	if (query.status) params.set('status', query.status);
	if (query.runId) params.set('runId', query.runId);
	if (query.take) params.set('take', String(query.take));
	const text = params.toString();
	return text ? `?${text}` : '';
}

/** How much of a value the list shows; the whole value is its tooltip. */
const CONFLICT_VALUE_MAX = 160;

/** A conflict's value as the list shows it. */
export interface ConflictValueView {
	/** The field was empty on that side. */
	empty: boolean;
	/** A due date: the instant to format (null for any other field, or a date that cannot be read). */
	date: Date | null;
	/** The due date is a calendar day (UTC midnight, as the providers' date-only due dates are stored). */
	calendarDay: boolean;
	/** The text shown, cut to a line or two. */
	text: string;
	/** The whole text (the tooltip). */
	full: string;
}

const EMPTY_VALUE: ConflictValueView = { empty: true, date: null, calendarDay: false, text: '', full: '' };

/**
 * A stored conflict value for the list: a description (kept as the task store's sanitized HTML) as its plain text, a
 * due date as a date, anything long cut. Never HTML: the list renders text only.
 */
export function conflictValueView(field: string, value: string | null | undefined): ConflictValueView {
	if (value === null || value === undefined) return EMPTY_VALUE;
	const raw = String(value).trim();
	if (!raw) return EMPTY_VALUE;
	if (field === 'dueDate') {
		const date = new Date(raw);
		if (!Number.isNaN(date.getTime())) {
			const calendarDay =
				date.getUTCHours() === 0 &&
				date.getUTCMinutes() === 0 &&
				date.getUTCSeconds() === 0 &&
				date.getUTCMilliseconds() === 0;
			return { empty: false, date, calendarDay, text: raw, full: raw };
		}
	}
	const full = field === 'description' ? plainTextOf(raw) : raw;
	if (!full) return EMPTY_VALUE;
	const text = full.length > CONFLICT_VALUE_MAX ? `${full.slice(0, CONFLICT_VALUE_MAX - 1).trimEnd()}…` : full;
	return { empty: false, date: null, calendarDay: false, text, full };
}

/** A tag, its quoted attribute values taken whole (a `>` inside quotes does not end it). */
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
/** The end of a block, or a line break: a space in the text. */
const BLOCK_END = /<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/blockquote|\/pre)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** One character reference (`&amp;`, `&#39;`, `&#x27;`) as its character; an unknown one stays as written. */
function decodeEntity(entity: string, body: string): string {
	if (body.startsWith('#x') || body.startsWith('#X')) {
		const code = Number.parseInt(body.slice(2), 16);
		return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	}
	if (body.startsWith('#')) {
		const code = Number.parseInt(body.slice(1), 10);
		return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
	}
	return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
}

/**
 * The text of an HTML fragment, without a DOM (the helper runs on the server too): block ends and line breaks become
 * spaces, tags go, character references are read, spaces collapse. What it returns is shown as text, never parsed.
 */
export function plainTextOf(html: string): string {
	return html
		.replace(BLOCK_END, ' ')
		.replace(TAG, '')
		.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => decodeEntity(entity, body))
		.replace(/\s+/g, ' ')
		.trim();
}

/** Why a resolve was refused: the task changed since (409), the conflict is resolved already (404), or anything else. */
export type ConflictResolveRefusal = 'stale' | 'notFound' | 'other';

export function conflictResolveRefusalOf(error: unknown): ConflictResolveRefusal {
	const status = errorStatusOf(error);
	if (status === 409) return 'stale';
	if (status === 404) return 'notFound';
	return 'other';
}
