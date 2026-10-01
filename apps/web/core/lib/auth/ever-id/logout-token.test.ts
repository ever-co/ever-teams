/**
 * Back-channel logout token verification against a local OpenID Provider that publishes ES256 keys: the
 * claims matrix, the key set cache, the unknown-`kid` cooldown and the issuer rules.
 */
// jose ships as an ES module only and jest runs CommonJS: Node itself loads it (require of an ES module).
jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'));

import { generateKeyPair } from 'jose';
import { MockIssuer } from '@/test/ever-id/mock-issuer';
import { createLogoutTokenVerifier, LogoutTokenError, type VerifiedLogoutToken } from './logout-token';

const CLIENT_ID = 'teams-web-client';

let issuer: MockIssuer;

beforeEach(async () => {
	issuer = await new MockIssuer(CLIENT_ID).start();
});

afterEach(async () => {
	await issuer.stop();
});

async function reason(promise: Promise<VerifiedLogoutToken>): Promise<string> {
	try {
		await promise;
		return 'accepted';
	} catch (error) {
		return error instanceof LogoutTokenError ? error.reason : `unexpected: ${String(error)}`;
	}
}

const keyFetches = () => issuer.requests.filter((request) => request.path === '/oauth/v2/keys').length;

describe('verifyLogoutToken', () => {
	it('accepts a valid logout token and returns its jti, sid and subject', async () => {
		const verifier = createLogoutTokenVerifier();
		const token = await issuer.sign(issuer.logoutClaims({ jti: 'jti-ok' }));

		const verified = await verifier.verify(token, { issuer: issuer.issuer, clientId: CLIENT_ID });

		expect(verified).toEqual(expect.objectContaining({ jti: 'jti-ok', sid: 'session-1', sub: 'person-1' }));
	});

	it.each([
		['for another audience', { aud: 'some-other-client' }, 'invalid'],
		['from another issuer', { iss: 'https://other-issuer.example.test' }, 'invalid'],
		['issued 301 s ago', { iat: Math.floor(Date.now() / 1000) - 301 }, 'stale'],
		['issued in the future', { iat: Math.floor(Date.now() / 1000) + 120 }, 'invalid'],
		['carrying a nonce', { nonce: 'n-1' }, 'invalid'],
		['without events', { events: undefined }, 'invalid'],
		['without the back-channel logout event', { events: { 'urn:other:event': {} } }, 'invalid'],
		[
			'whose logout event is not an object',
			{ events: { 'http://schemas.openid.net/event/backchannel-logout': 1 } },
			'invalid'
		],
		['naming neither a session nor a subject', { sid: undefined, sub: undefined }, 'invalid'],
		['without a jti', { jti: undefined }, 'invalid'],
		['already expired', { exp: Math.floor(Date.now() / 1000) - 120 }, 'invalid']
	])('refuses a token %s', async (_label, overrides, expected) => {
		const verifier = createLogoutTokenVerifier();
		const token = await issuer.sign(issuer.logoutClaims(overrides));

		expect(await reason(verifier.verify(token, { issuer: issuer.issuer, clientId: CLIENT_ID }))).toBe(expected);
	});

	it('accepts a token naming only the subject, or only the session', async () => {
		const verifier = createLogoutTokenVerifier();
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };

		const subjectOnly = await verifier.verify(await issuer.sign(issuer.logoutClaims({ sid: undefined })), options);
		const sessionOnly = await verifier.verify(await issuer.sign(issuer.logoutClaims({ sub: undefined })), options);

		expect(subjectOnly).toEqual(expect.objectContaining({ sub: 'person-1', sid: undefined }));
		expect(sessionOnly).toEqual(expect.objectContaining({ sid: 'session-1', sub: undefined }));
	});

	it('refuses a tampered signature, an unsigned token and anything that is not a JWS', async () => {
		const verifier = createLogoutTokenVerifier();
		const [header, payload] = (await issuer.sign(issuer.logoutClaims())).split('.');
		const unsigned = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${payload}.`;
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };

		expect(await reason(verifier.verify(`${header}.${payload}.${'A'.repeat(86)}`, options))).toBe('invalid');
		expect(await reason(verifier.verify(unsigned, options))).toBe('invalid');
		expect(await reason(verifier.verify('not-a-token', options))).toBe('invalid');
	});

	it('reuses the key set instead of fetching it for every token', async () => {
		const verifier = createLogoutTokenVerifier();
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };

		await verifier.verify(await issuer.sign(issuer.logoutClaims()), options);
		await verifier.verify(await issuer.sign(issuer.logoutClaims()), options);

		expect(keyFetches()).toBe(1);
	});

	it('refetches the key set once for an unknown kid, and not again within the cooldown', async () => {
		const verifier = createLogoutTokenVerifier({ jwksCooldownMs: 200 });
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };
		await verifier.verify(await issuer.sign(issuer.logoutClaims()), options);
		expect(keyFetches()).toBe(1);

		// The issuer rotated its key: after the cooldown a token with the new kid triggers one refetch.
		await issuer.rotateKey('test-key-2');
		await new Promise((resolve) => setTimeout(resolve, 250));
		expect(await reason(verifier.verify(await issuer.sign(issuer.logoutClaims()), options))).toBe('accepted');
		expect(keyFetches()).toBe(2);

		// Another unknown kid right away: refused without fetching again.
		const { privateKey } = await generateKeyPair('ES256');
		const unknown = await issuer.sign(issuer.logoutClaims(), { kid: 'never-published', key: privateKey });
		expect(await reason(verifier.verify(unknown, options))).toBe('invalid');
		expect(keyFetches()).toBe(2);
	});

	it('answers unavailable when the issuer cannot be reached', async () => {
		const verifier = createLogoutTokenVerifier();
		const token = await issuer.sign(issuer.logoutClaims());
		const unreachable = issuer.issuer;
		await issuer.stop();

		expect(await reason(verifier.verify(token, { issuer: unreachable, clientId: CLIENT_ID }))).toBe('unavailable');
	});

	it('never contacts a plain-http issuer that is not on this machine', async () => {
		const verifier = createLogoutTokenVerifier();
		const fetchSpy = jest.spyOn(globalThis, 'fetch');
		const token = await issuer.sign(issuer.logoutClaims());

		expect(await reason(verifier.verify(token, { issuer: 'http://id.example.test', clientId: CLIENT_ID }))).toBe(
			'unavailable'
		);
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});
});
