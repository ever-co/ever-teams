function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * What a social (Google, GitHub, …) sign-in left in the next-auth session: the Gauzy tokens, ids and workspaces the
 * jwt callback stored in `token.authCookie`, which the session callback hands on as `session.authCookie` (auth.ts).
 * The welcome and workspace pages read them from `session.user`, which holds only the profile (name, e-mail, image),
 * so a social sign-in never reached a workspace. `session.user` stays the fallback for a session written before.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the next-auth record is untyped, as `session.user` was: each page picks the fields it reads
export function readSocialSession(session: unknown): Record<string, any> | null {
	if (!isRecord(session)) return null;
	// An Ever ID session has its own reader (ever-id/session.ts)
	if (isRecord(session.authCookie)) return session.authCookie.provider === 'ever-id' ? null : session.authCookie;
	return isRecord(session.user) ? session.user : null;
}

/** A refresh token as the session stores it (`{ token }` from the jwt callback) or as a plain string. */
export function socialRefreshToken(value: unknown): string | undefined {
	if (typeof value === 'string') return value;
	return isRecord(value) && typeof value.token === 'string' ? value.token : undefined;
}
