/**
 * Gauzy rotates the refresh token: each renewal answers a new pair, and the refresh token it was given is refused
 * from then on. These are the 401 messages it answers when the token was rotated, or is being rotated, by another
 * request (ever-gauzy `validate-token-query.handler.ts` and `rotate-token-command.handler.ts`).
 *
 * Such a refusal does not say the session ended: the request that rotated the token has the new pair, and gives it
 * to the browser. The server (proxy.ts) and the browser (session-renewal.ts) both read it that way.
 */
const ROTATED_REFRESH_TOKEN_MESSAGES = new Set([
	'Token is rotated',
	'Token is not active',
	'Failed to rotate token - concurrent modification'
]);

/** Whether a 401 of the refresh route says another request rotated the refresh token first. */
export function isRotatedRefreshTokenRefusal(message: unknown): boolean {
	return typeof message === 'string' && ROTATED_REFRESH_TOKEN_MESSAGES.has(message);
}
