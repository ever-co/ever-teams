/**
 * A social sign-in's Gauzy tokens and workspaces are in `session.authCookie` (auth.ts jwt + session callbacks), not in
 * `session.user`, which next-auth fills with the profile only.
 */
import { readSocialSession, socialRefreshToken } from './social-session';

describe('readSocialSession', () => {
	it('reads the data the jwt callback stored in authCookie', () => {
		const authCookie = { access_token: 'a', refresh_token: { token: 'r' }, workspaces: [{ token: 'w' }] };

		expect(readSocialSession({ user: { name: 'Ada', email: 'ada@example.com' }, authCookie })).toBe(authCookie);
	});

	it('falls back to session.user for a session written the old way', () => {
		const user = { access_token: 'a' };

		expect(readSocialSession({ user })).toBe(user);
	});

	it('leaves an Ever ID session to its own reader', () => {
		expect(readSocialSession({ authCookie: { provider: 'ever-id', workspaces: [] } })).toBeNull();
	});

	it.each([[null], [undefined], ['session']])('reads nothing from %p', (session) => {
		expect(readSocialSession(session)).toBeNull();
	});
});

describe('socialRefreshToken', () => {
	it.each([
		[{ token: 'r' }, 'r'],
		['r', 'r'],
		[undefined, undefined],
		[{ decoded: {} }, undefined]
	])('reads %p as %p', (value, expected) => {
		expect(socialRefreshToken(value)).toBe(expected);
	});
});
