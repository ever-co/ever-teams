import { readRuntimeEnv } from '@/env-config';

/**
 * Whether this deployment edits Docs pages live (`NEXT_PUBLIC_DOCS_LIVE_ENABLED=true`, read at runtime). Off by
 * default: pages keep the single-writer autosave with its conflict handling. On, a page opens a live session on the
 * platform (`GAUZY_DOCS_LIVE_ENABLED`) when the platform serves one, and falls back to the autosave when it does not.
 */
export function isDocsLiveEnabled(): boolean {
	const value = readRuntimeEnv('NEXT_PUBLIC_DOCS_LIVE_ENABLED') || process.env.NEXT_PUBLIC_DOCS_LIVE_ENABLED;
	return String(value ?? '').trim() === 'true';
}

/** Local edits are sent together, this long after the first one of a batch. */
export const DOCS_LIVE_BATCH_MS = 75;

/** The cursor and presence of this tab are sent at most this often. */
export const DOCS_LIVE_AWARENESS_MS = 120;

/** A session whose first state has not arrived after this long gives way to the autosave. */
export const DOCS_LIVE_SYNC_TIMEOUT_MS = 10_000;

/** How long a comment or a copied block link waits for the platform to confirm the page's edits (its new anchor). */
export const DOCS_LIVE_CONFIRM_TIMEOUT_MS = 10_000;

/** Reopening a dropped session: jittered exponential from the first to the second value. */
export const DOCS_LIVE_BACKOFF_MIN_MS = 1_000;
export const DOCS_LIVE_BACKOFF_MAX_MS = 30_000;

/** How many pages keep their live document in this tab after they were left (edits not sent yet go on the next visit). */
export const DOCS_LIVE_REMEMBERED_PAGES = 8;

/** The XML fragment the editor and the platform share (TipTap's `Collaboration` default). */
export const DOCS_LIVE_FIELD = 'default';

const CONNECTION_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * A connection id for one tab's session of a page: 24 letters and digits, inside the platform's 8–64 of
 * `[A-Za-z0-9_-]`.
 */
export function newConnectionId(random: () => number = Math.random): string {
	const bytes = new Uint8Array(24);
	const crypto = (globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }).crypto;
	if (crypto?.getRandomValues) crypto.getRandomValues(bytes);
	else for (let at = 0; at < bytes.length; at += 1) bytes[at] = Math.floor(random() * 256);
	let id = '';
	for (const byte of bytes) id += CONNECTION_ALPHABET[byte % CONNECTION_ALPHABET.length];
	return id;
}
