/**
 * The Ever ID hand-off key: an opaque one-time key the Gauzy API issues when an Ever ID sign-in continues on
 * another page (Gauzy's one-time e-mail code, or the sign-up confirmation). It is the ONLY Ever ID value that
 * ever goes into a URL: never a token, never an e-mail address.
 */

/** The query parameter that carries the key to the passcode and sign-up pages. */
export const EVER_ID_HANDOFF_PARAM = 'ever_id_handoff';

/** The API issues 43 base64url characters; anything far outside that shape is not a key. */
const EVER_ID_HANDOFF_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** The key when `value` has the shape of one, otherwise `null`. */
export function readEverIdHandoff(value: string | null | undefined): string | null {
	return typeof value === 'string' && EVER_ID_HANDOFF_PATTERN.test(value) ? value : null;
}

/** A same-origin path that carries only the hand-off key, e.g. `/auth/passcode?ever_id_handoff=…`. */
export function everIdHandoffPath(path: '/auth/passcode' | '/auth/signup', handoff: string): string {
	return `${path}?${new URLSearchParams({ [EVER_ID_HANDOFF_PARAM]: handoff }).toString()}`;
}
