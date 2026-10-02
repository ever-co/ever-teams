/**
 * The one-time hand-off key never goes into a URL: it is sealed (AES-256-GCM, under a key derived from AUTH_SECRET)
 * with its step and an expiry into an httpOnly cookie for this app's /api/auth routes. A value this server did not
 * seal, of another step, past its expiry or tampered with is no key at all.
 */
import { randomBytes } from 'node:crypto';

type HandoffModule = typeof import('./handoff');

const KEY = 'Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGx5';
const ORIGINAL_SECRET = process.env.AUTH_SECRET;

/** The module as a server started with this AUTH_SECRET loads it. */
function load(secret: string | undefined): HandoffModule {
	let mod!: HandoffModule;
	jest.isolateModules(() => {
		if (secret === undefined) delete process.env.AUTH_SECRET;
		else process.env.AUTH_SECRET = secret;
		mod = require('./handoff');
	});
	return mod;
}

afterEach(() => {
	if (ORIGINAL_SECRET === undefined) delete process.env.AUTH_SECRET;
	else process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

describe('the hand-off key shape', () => {
	const { readEverIdHandoff } = load('test-only-auth-secret');

	it('accepts a base64url key', () => {
		expect(readEverIdHandoff(KEY)).toBe(KEY);
	});

	it.each([
		['an e-mail address', 'person@example.test'],
		['a JWT', `${Buffer.from('{"alg":"none"}').toString('base64url')}.e30.unsigned`],
		['a path', '../../auth/passcode'],
		['too short', 'abc'],
		['too long', 'a'.repeat(129)],
		['empty', ''],
		['missing', null],
		['not a string', 42]
	])('ignores %s', (_label, value) => {
		expect(readEverIdHandoff(value)).toBeNull();
	});
});

describe('the sealed hand-off cookie', () => {
	it('opens to the key for its own step only', () => {
		const { sealEverIdHandoff, openEverIdHandoff } = load('test-only-auth-secret');

		const sealed = sealEverIdHandoff(KEY, 'confirm');

		expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(sealed).not.toContain(KEY);
		expect(openEverIdHandoff(sealed, 'confirm')).toBe(KEY);
		expect(openEverIdHandoff(sealed, 'signup')).toBeNull();
	});

	it('is different every time, even for the same key', () => {
		const { sealEverIdHandoff } = load('test-only-auth-secret');

		expect(sealEverIdHandoff(KEY, 'signup')).not.toBe(sealEverIdHandoff(KEY, 'signup'));
	});

	it('expires after 30 minutes', () => {
		const { sealEverIdHandoff, openEverIdHandoff } = load('test-only-auth-secret');
		const now = Date.now();

		const sealed = sealEverIdHandoff(KEY, 'signup', now);

		expect(openEverIdHandoff(sealed, 'signup', now + 29 * 60_000)).toBe(KEY);
		expect(openEverIdHandoff(sealed, 'signup', now + 30 * 60_000)).toBeNull();
	});

	it('refuses a value sealed under another secret', () => {
		const sealed = load('another-servers-secret').sealEverIdHandoff(KEY, 'signup');

		expect(load('test-only-auth-secret').openEverIdHandoff(sealed, 'signup')).toBeNull();
	});

	it('refuses a tampered value', () => {
		const { sealEverIdHandoff, openEverIdHandoff } = load('test-only-auth-secret');
		const raw = Buffer.from(sealEverIdHandoff(KEY, 'signup') as string, 'base64url');
		raw[raw.length - 1] ^= 0x01;

		expect(openEverIdHandoff(raw.toString('base64url'), 'signup')).toBeNull();
	});

	it.each([
		['random bytes', randomBytes(64).toString('base64url')],
		['the plain key', KEY],
		['an empty value', ''],
		['an oversized value', 'a'.repeat(2048)],
		['nothing', undefined]
	])('refuses %s', (_label, value) => {
		expect(load('test-only-auth-secret').openEverIdHandoff(value, 'signup')).toBeNull();
	});

	it('cannot seal a malformed key, nor anything without a secret', () => {
		expect(load('test-only-auth-secret').sealEverIdHandoff('person@example.test', 'signup')).toBeNull();
		expect(load(undefined).sealEverIdHandoff(KEY, 'signup')).toBeNull();
		expect(load(undefined).openEverIdHandoff('anything', 'signup')).toBeNull();
	});

	it('is an httpOnly, SameSite=Lax cookie for /api/auth only, with a 30-minute lifetime', () => {
		const { everIdHandoffCookie, clearedEverIdHandoffCookie } = load('test-only-auth-secret');

		expect(everIdHandoffCookie('sealed', true)).toEqual({
			name: 'ever-id-handoff',
			value: 'sealed',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			path: '/api/auth',
			maxAge: 1800
		});
		expect(clearedEverIdHandoffCookie(false)).toEqual(
			expect.objectContaining({ name: 'ever-id-handoff', value: '', maxAge: 0, path: '/api/auth', secure: false })
		);
	});

	it('is read from the Cookie header of a request, for its step', () => {
		const { sealEverIdHandoff, everIdHandoffFromRequest } = load('test-only-auth-secret');
		const sealed = sealEverIdHandoff(KEY, 'confirm');
		const request = (cookie?: string) =>
			new Request('https://app.example.test/api/auth/ever-id/confirm', {
				method: 'POST',
				headers: cookie ? { cookie } : {}
			});

		expect(everIdHandoffFromRequest(request(`theme=dark; ever-id-handoff=${sealed}; lang=en`), 'confirm')).toBe(
			KEY
		);
		expect(everIdHandoffFromRequest(request(`ever-id-handoff=${sealed}`), 'signup')).toBeNull();
		expect(everIdHandoffFromRequest(request('ever-id-handoff-x=abc'), 'confirm')).toBeNull();
		expect(everIdHandoffFromRequest(request(), 'confirm')).toBeNull();
	});
});

describe('the other hosts of the domain', () => {
	it('reads the value sealed here even when another host of the domain set a cookie of the same name first', () => {
		const { sealEverIdHandoff, everIdHandoffFromRequest } = load('test-only-auth-secret');
		const request = new Request('https://app.example.test/api/auth/ever-id/confirm', {
			method: 'POST',
			headers: {
				cookie: `ever-id-handoff=planted-by-a-sibling; ever-id-handoff=${sealEverIdHandoff(KEY, 'confirm')}`
			}
		});

		expect(everIdHandoffFromRequest(request, 'confirm')).toBe(KEY);
	});
});

describe('everIdFlowId', () => {
	it('is a short fingerprint that is stable for a key, differs between keys and does not show the key', () => {
		const { everIdFlowId } = load('test-only-auth-secret');

		expect(everIdFlowId(KEY)).toMatch(/^[A-Za-z0-9_-]{16}$/);
		expect(everIdFlowId(KEY)).toBe(everIdFlowId(KEY));
		expect(everIdFlowId(KEY)).not.toBe(everIdFlowId(`${KEY.slice(0, -1)}A`));
		expect(KEY).not.toContain(everIdFlowId(KEY));
	});
});

describe('everIdCookieSecure', () => {
	const ORIGINAL_AUTH_URL = process.env.AUTH_URL;
	afterEach(() => {
		if (ORIGINAL_AUTH_URL === undefined) delete process.env.AUTH_URL;
		else process.env.AUTH_URL = ORIGINAL_AUTH_URL;
	});

	it('follows the configured app URL first, like next-auth', () => {
		const { everIdCookieSecure } = load('test-only-auth-secret');
		const proxiedHttp = new Headers({ 'x-forwarded-proto': 'http' });

		process.env.AUTH_URL = 'https://teams.example.test';
		expect(everIdCookieSecure(proxiedHttp, 'http://app.internal/api/auth')).toBe(true);
		process.env.AUTH_URL = 'http://localhost:3030';
		expect(everIdCookieSecure(new Headers({ 'x-forwarded-proto': 'https' }))).toBe(false);
		delete process.env.AUTH_URL;
		expect(everIdCookieSecure(proxiedHttp)).toBe(false);
		expect(everIdCookieSecure(new Headers({ 'x-forwarded-proto': 'https' }))).toBe(true);
	});
});

describe('the request protocol, without a configured app URL', () => {
	const ORIGINAL_AUTH_URL = process.env.AUTH_URL;
	beforeEach(() => {
		delete process.env.AUTH_URL;
		delete process.env.NEXTAUTH_URL;
	});
	afterEach(() => {
		if (ORIGINAL_AUTH_URL === undefined) delete process.env.AUTH_URL;
		else process.env.AUTH_URL = ORIGINAL_AUTH_URL;
	});

	it.each([
		['the proxy says https', { 'x-forwarded-proto': 'https' }, 'http://app.internal/api/auth', true],
		['the first proxy says https', { 'x-forwarded-proto': 'https, http' }, 'http://app.internal/api', true],
		['the proxy says http', { 'x-forwarded-proto': 'http' }, 'https://app.example.test/api', false],
		['no proxy, https URL', {}, 'https://app.example.test/api/auth', true],
		['no proxy, http URL', {}, 'http://localhost:3030/api/auth', false]
	])('%s', (_label, headers, url, expected) => {
		const { everIdCookieSecure } = load('test-only-auth-secret');

		expect(everIdCookieSecure(new Headers(headers as Record<string, string>), url)).toBe(expected);
	});
});
