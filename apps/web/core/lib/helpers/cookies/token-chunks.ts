/**
 * The most cookies a long access token is split into. A sign-in writes 4000 characters per chunk
 * (`setLargeStringInCookies`), and a request's `Cookie` header cannot carry more than a few dozen of those.
 */
export const MAX_TOKEN_COOKIE_CHUNKS = 64;

/**
 * How many chunks a `<name>_totalChunks` cookie announces, or null when the value is not a count a sign-in writes.
 *
 * The value comes from the client, so it must never size a loop as it stands: `proxy.ts` reads it before any
 * authentication on every page, and `auth-token_totalChunks=100000000` made one anonymous request block the
 * server's event loop for seconds and allocate gigabytes. Anything but a whole number from 1 to
 * {@link MAX_TOKEN_COOKIE_CHUNKS} is treated as no chunked token at all.
 */
export function tokenCookieChunkCount(value: unknown): number | null {
	if (typeof value !== 'string' || !/^\d{1,3}$/.test(value.trim())) return null;
	const count = Number(value.trim());
	return count >= 1 && count <= MAX_TOKEN_COOKIE_CHUNKS ? count : null;
}
