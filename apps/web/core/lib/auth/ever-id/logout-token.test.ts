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
		// Wide margins: the third token below must reach the verifier well within the cooldown, even on a slow runner.
		const verifier = createLogoutTokenVerifier({ jwksCooldownMs: 2_000 });
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };
		await verifier.verify(await issuer.sign(issuer.logoutClaims()), options);
		expect(keyFetches()).toBe(1);

		// The issuer rotated its key: after the cooldown a token with the new kid triggers one refetch.
		await issuer.rotateKey('test-key-2');
		await new Promise((resolve) => setTimeout(resolve, 2_500));
		expect(await reason(verifier.verify(await issuer.sign(issuer.logoutClaims()), options))).toBe('accepted');
		expect(keyFetches()).toBe(2);

		// Another unknown kid right away: no refetch, and a retryable answer (a rotated-in key may not be served yet).
		const { privateKey } = await generateKeyPair('ES256');
		const unknown = await issuer.sign(issuer.logoutClaims(), { kid: 'never-published', key: privateKey });
		expect(await reason(verifier.verify(unknown, options))).toBe('unavailable');
		expect(keyFetches()).toBe(2);
	}, 10_000);

	it('answers unavailable when the issuer cannot be reached', async () => {
		const verifier = createLogoutTokenVerifier();
		const token = await issuer.sign(issuer.logoutClaims());
		const unreachable = issuer.issuer;
		await issuer.stop();

		expect(await reason(verifier.verify(token, { issuer: unreachable, clientId: CLIENT_ID }))).toBe('unavailable');
	});

	it('compares the issuer exactly: a root issuer with or without its slash is the same, a path issuer is not', async () => {
		const token = await issuer.sign(issuer.logoutClaims());
		expect(
			await reason(
				createLogoutTokenVerifier().verify(token, { issuer: `${issuer.issuer}/`, clientId: CLIENT_ID })
			)
		).toBe('accepted');

		const pathIssuer = await new MockIssuer(CLIENT_ID, '/realms/teams').start();
		try {
			const pathToken = await pathIssuer.sign(pathIssuer.logoutClaims());
			expect(
				await reason(
					createLogoutTokenVerifier().verify(pathToken, { issuer: pathIssuer.issuer, clientId: CLIENT_ID })
				)
			).toBe('accepted');
			expect(
				await reason(
					createLogoutTokenVerifier().verify(pathToken, {
						issuer: `${pathIssuer.issuer}/`,
						clientId: CLIENT_ID
					})
				)
			).toBe('unavailable');
		} finally {
			await pathIssuer.stop();
		}
	});

	it('shares one discovery between concurrent tokens', async () => {
		const verifier = createLogoutTokenVerifier();
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };
		const tokens = await Promise.all([1, 2, 3].map(() => issuer.sign(issuer.logoutClaims())));

		const results = await Promise.all(tokens.map((token) => reason(verifier.verify(token, options))));

		expect(results).toEqual(['accepted', 'accepted', 'accepted']);
		expect(issuer.requests.filter((request) => request.path.endsWith('/openid-configuration'))).toHaveLength(1);
	});

	it('does not try a failed discovery again for a while', async () => {
		const verifier = createLogoutTokenVerifier({ discoveryRetryMs: 60_000 });
		const token = await issuer.sign(issuer.logoutClaims());
		const unreachable = issuer.issuer;
		await issuer.stop();
		const fetchSpy = jest.spyOn(globalThis, 'fetch');

		expect(await reason(verifier.verify(token, { issuer: unreachable, clientId: CLIENT_ID }))).toBe('unavailable');
		expect(await reason(verifier.verify(token, { issuer: unreachable, clientId: CLIENT_ID }))).toBe('unavailable');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		fetchSpy.mockRestore();
	});

	it('takes keys over plain http only when the issuer itself is on this machine', async () => {
		const options = { issuer: issuer.issuer, clientId: CLIENT_ID };
		const token = await issuer.sign(issuer.logoutClaims());

		// A local issuer pointing at keys elsewhere over plain http: refused without fetching them.
		issuer.jwksUri = 'http://keys.example.test/oauth/v2/keys';
		const fetchSpy = jest.spyOn(globalThis, 'fetch');
		expect(await reason(createLogoutTokenVerifier().verify(token, options))).toBe('unavailable');
		expect(fetchSpy.mock.calls.map(([url]) => String(url))).not.toContainEqual(
			expect.stringContaining('keys.example.test')
		);
		fetchSpy.mockRestore();

		// A remote issuer pointing at keys on this machine over plain http: refused as well.
		const discovery = jest
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				new Response(
					JSON.stringify({ issuer: 'https://id.example.test', jwks_uri: `${issuer.issuer}/oauth/v2/keys` }),
					{ status: 200, headers: { 'content-type': 'application/json' } }
				)
			);
		expect(
			await reason(
				createLogoutTokenVerifier().verify(token, { issuer: 'https://id.example.test', clientId: CLIENT_ID })
			)
		).toBe('unavailable');
		expect(discovery).toHaveBeenCalledTimes(1);
		expect(keyFetches()).toBe(0);
		discovery.mockRestore();
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
