/**
 * The platform's live sessions of Docs pages as this app reads them (ever-gauzy `DocsLivePlugin`,
 * `GAUZY_DOCS_LIVE_ENABLED`): one GraphQL subscription per tab and page streams the frames, and the tab sends its
 * edits and its cursor to two routes. Binary payloads (Yjs updates, state vectors, y-protocols awareness updates)
 * travel as base64.
 */

/** One frame of a session. */
export interface DocsLiveFrame {
	/**
	 * What it says: `sync` first, then `update` (an edit), `awareness` (cursors, presence), `mode` (read-only or
	 * writable) and, last, `closed`. A kind this client does not know yet is skipped.
	 */
	kind: string;
	documentId: string;
	update?: string | null;
	stateVector?: string | null;
	awareness?: string | null;
	readOnly?: boolean | null;
	reason?: string | null;
	revision?: number | null;
	lineage?: string | null;
}

/** Why a session is read-only (`mode`, `sync`) or why it closed (`closed`). */
export const DOCS_LIVE_REASONS = {
	NO_WRITE_ACCESS: 'no_write_access',
	LOCKED: 'locked',
	SESSION_LIMIT: 'session_limit',
	SIZE_LIMIT: 'size_limit',
	ACCESS_REVOKED: 'access_revoked',
	TRASHED: 'trashed',
	REPLACED: 'replaced',
	OVERLOADED: 'overloaded',
	SHUTDOWN: 'shutdown'
} as const;

/** The platform's refusals of the two routes the binding reacts to. */
export const DOCS_LIVE_SESSION_NOT_FOUND = 'DOCS_LIVE_SESSION_NOT_FOUND';
export const DOCS_LIVE_READ_ONLY = 'DOCS_LIVE_READ_ONLY';
export const DOCS_LIVE_TOO_LARGE = 'DOCS_LIVE_TOO_LARGE';
export const DOCS_LIVE_USER_LIMIT = 'DOCS_LIVE_USER_LIMIT';
/** An edit touching a block the page's schema does not accept: the platform applied nothing of it. */
export const DOCS_LIVE_UPDATE_INVALID = 'DOCS_LIVE_UPDATE_INVALID';

/** `GET /plugins/docs/live/status`: 404 when the platform does not serve live sessions. */
export interface DocsLiveStatus {
	enabled: boolean;
	shared: boolean;
	documents: number;
	sessions: number;
}

/** The answer to an edit or a cursor sent to the page. */
export interface DocsLiveAck {
	accepted: boolean;
	relayed: boolean;
}

export const DOCUMENT_LIVE_SUBSCRIPTION = `subscription DocumentLive($documentId: ID!, $connectionId: String!) {
	documentLive(documentId: $documentId, connectionId: $connectionId) {
		kind
		documentId
		update
		stateVector
		awareness
		readOnly
		reason
		revision
		lineage
	}
}`;

/** Bytes as base64, in chunks small enough for one `String.fromCodePoint` call. */
export function toBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunk = 0x8000;
	for (let at = 0; at < bytes.length; at += chunk) {
		binary += String.fromCodePoint(...bytes.subarray(at, at + chunk));
	}
	return btoa(binary);
}

/** Base64 back to bytes; `null` for a value that is not base64. */
export function fromBase64(value: string | null | undefined): Uint8Array | null {
	if (!value) return null;
	try {
		const binary = atob(value);
		const bytes = new Uint8Array(binary.length);
		for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.codePointAt(at) ?? 0;
		return bytes;
	} catch {
		return null;
	}
}
