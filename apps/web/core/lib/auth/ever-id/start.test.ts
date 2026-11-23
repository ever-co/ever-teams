/**
 * Ever ID: the rules of the sign-in start address (`/api/auth/ever-id/start`).
 *
 * The address is a link anyone can write, so the return path it names is the one place an open redirect could come
 * from. Every refused shape is pinned here by name: an absolute URL, `//host`, a backslash, a control or invisible
 * character, a dot segment, and each of those behind one or more layers of percent-encoding.
 */
import {
	EVER_ID_SIGN_IN_LANDING_PATH,
	EVER_ID_START_RETURN_COOKIE,
	EVER_ID_START_RETURN_MAX_AGE_S,
	EVER_ID_START_RETURN_MAX_LENGTH,
	EVER_ID_START_RETURN_PARAM,
	EVER_ID_START_ROUTE_SWITCH,
	everIdStartReturnCookie,
	isEverIdStartNavigation,
	hasEverIdStartReturnCookie,
	isEverIdStartRouteEnabled,
	readEverIdStartReturnCookie,
	readEverIdStartReturnPath,
	toEverIdStartReturnPath
} from './start';

/** Where a browser would end up, were the value sent as a `Location` on this origin. */
const ORIGIN = 'https://teams.example.test';
function landsOn(value: string): string {
	return new URL(value, ORIGIN).origin;
}

describe('isEverIdStartRouteEnabled: off unless `true`', () => {
	it('names the switch once', () => {
		expect(EVER_ID_START_ROUTE_SWITCH).toBe('EVER_ID_START_ROUTE_ENABLED');
	});

	it('is off when the variable is unset', () => {
		expect(isEverIdStartRouteEnabled({})).toBe(false);
	});

	it.each(['true', 'TRUE', 'True', ' true '])('is on for %j', (value) => {
		expect(isEverIdStartRouteEnabled({ EVER_ID_START_ROUTE_ENABLED: value })).toBe(true);
	});

	// cspell:ignore truee
	it.each(['', 'false', '1', 'yes', 'on', 'enabled', 'truee', 'tru e'])('is off for %j', (value) => {
		expect(isEverIdStartRouteEnabled({ EVER_ID_START_ROUTE_ENABLED: value })).toBe(false);
	});

	it('reads the process environment by default, per call', () => {
		const saved = process.env.EVER_ID_START_ROUTE_ENABLED;
		try {
			delete process.env.EVER_ID_START_ROUTE_ENABLED;
			expect(isEverIdStartRouteEnabled()).toBe(false);
			process.env.EVER_ID_START_ROUTE_ENABLED = 'true';
			expect(isEverIdStartRouteEnabled()).toBe(true);
		} finally {
			if (saved === undefined) delete process.env.EVER_ID_START_ROUTE_ENABLED;
			else process.env.EVER_ID_START_ROUTE_ENABLED = saved;
		}
	});
});

describe('isEverIdStartNavigation: only a person following a link', () => {
	const request = (headers: Record<string, string> = {}, method = 'GET') => ({
		method,
		headers: new Headers(headers)
	});

	it('accepts a top-level navigation, from this site or another', () => {
		for (const site of ['cross-site', 'same-site', 'same-origin', 'none']) {
			expect(
				isEverIdStartNavigation(
					request({ 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Site': site })
				)
			).toBe(true);
		}
	});

	it('accepts a client that describes nothing about the request', () => {
		expect(isEverIdStartNavigation(request())).toBe(true);
	});

	it.each(['cors', 'no-cors', 'same-origin', 'websocket'])(
		'refuses a background request (Sec-Fetch-Mode: %s)',
		(mode) => {
			expect(isEverIdStartNavigation(request({ 'Sec-Fetch-Mode': mode }))).toBe(false);
		}
	);

	it.each(['image', 'script', 'iframe', 'frame', 'embed', 'object', 'empty', 'style'])(
		'refuses a load that is not the page itself (Sec-Fetch-Dest: %s)',
		(destination) => {
			expect(
				isEverIdStartNavigation(request({ 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': destination }))
			).toBe(false);
		}
	);

	it.each([
		['Sec-Purpose', 'prefetch'],
		['Sec-Purpose', 'prefetch;prerender'],
		['Sec-Purpose', 'prefetch;anonymous-client-ip'],
		['Purpose', 'prefetch'],
		['Purpose', 'preview']
	])('refuses a load made ahead of a click (%s: %s)', (name, value) => {
		expect(
			isEverIdStartNavigation(
				request({ 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', [name]: value })
			)
		).toBe(false);
	});

	it.each(['HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'])('refuses %s', (method) => {
		expect(isEverIdStartNavigation(request({}, method))).toBe(false);
	});
});

describe('toEverIdStartReturnPath: a path of this site, and nothing else', () => {
	it.each([
		'/',
		'/kanban',
		'/task/42',
		'/settings/team?tab=members#invite',
		'/timesheet/',
		'/search?q=a%20b',
		'/profile/01ARZ3NDEKTSV4RRFFQ69G5FAV?name=Ever%20Teams',
		'/kanban?next=%2Ftask%2F42'
	])('keeps %s', (path) => {
		expect(toEverIdStartReturnPath(path)).toBe(path);
		expect(landsOn(path)).toBe(ORIGIN);
	});

	it('keeps a path that only looks like a host: it stays a path of this site', () => {
		for (const path of ['/evil.example', '/@evil.example', '/kanban?u=//evil.example']) {
			expect(toEverIdStartReturnPath(path)).toBe(path);
			expect(landsOn(path)).toBe(ORIGIN);
		}
	});

	describe('refuses an absolute URL', () => {
		it.each([
			'https://evil.example/phish',
			'http://evil.example',
			'HTTPS://EVIL.EXAMPLE',
			'https://teams.example.test/kanban',
			'http://localhost:3030/kanban',
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'mailto:someone@evil.example',
			'evil.example/kanban',
			'kanban',
			'?return=/kanban',
			'#kanban'
		])('%j', (value) => {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		});
	});

	describe('refuses `//host` and any empty path segment', () => {
		it.each([
			'//evil.example',
			'//evil.example/kanban',
			'///evil.example',
			'////evil.example',
			'/kanban//evil.example',
			'/kanban//'
		])('%j', (value) => {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		});
	});

	describe('refuses a backslash, wherever it is', () => {
		it.each([
			'/\\evil.example',
			'\\\\evil.example',
			'\\/evil.example',
			'/\\/evil.example',
			'/kanban\\evil.example',
			'/kanban?next=\\evil.example',
			'/kanban#\\evil.example'
		])('%j', (value) => {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		});
	});

	describe('refuses the encoded spellings of all of those, at any depth', () => {
		it.each([
			// `//host` behind one, two and three layers of encoding.
			'/%2Fevil.example',
			'/%2fevil.example',
			'/%2F%2Fevil.example',
			'/%252Fevil.example',
			'/%25252Fevil.example',
			'/kanban/%2F/evil.example',
			// Not even a path until it is decoded.
			'%2F%2Fevil.example',
			'%2Fkanban',
			'https%3A%2F%2Fevil.example',
			// A backslash.
			'/%5Cevil.example',
			'/%5cevil.example',
			'/%255Cevil.example',
			'/kanban?next=%5Cevil.example',
			// Dot segments.
			'/%2e%2e/evil.example',
			'/%2E%2E%2Fevil.example',
			'/.%2e/evil.example',
			'/kanban/..%2F..%2Fevil.example',
			'/%252e%252e/evil.example',
			// Control and invisible characters.
			'/%09/evil.example',
			'/%0A/evil.example',
			'/%0d%0aSet-Cookie:%20a=b',
			'/%00',
			'/kanban%7F',
			'/kanban%E2%80%8B',
			'/kanban%E2%80%AE',
			'/kanban%E2%80%A8',
			'/kanban%EF%BB%BF',
			'/%2509/evil.example'
		])('%j', (value) => {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		});

		it.each(['/%', '/%2', '/%zz', '/kanban%', '/%E0%A4%A', '/%ff', '/%C0%AF'])(
			'refuses a malformed escape (%j)',
			(value) => {
				expect(toEverIdStartReturnPath(value)).toBeUndefined();
			}
		);

		it('refuses a value that is still encoded after four layers', () => {
			// `/a b`, encoded n times over: `/a%20b`, `/a%2520b`, `/a%252520b`, ...
			const layers = (count: number) => `/a%${'25'.repeat(count - 1)}20b`;

			expect(decodeURIComponent(layers(1))).toBe('/a b');
			for (const count of [1, 2, 3, 4]) {
				expect(toEverIdStartReturnPath(layers(count))).toBe(layers(count));
			}
			for (const count of [5, 6, 12]) {
				expect(toEverIdStartReturnPath(layers(count))).toBeUndefined();
			}
		});
	});

	describe('refuses a control or invisible character, and whitespace', () => {
		it.each([
			// A browser drops a tab or a line break while reading an address: `/<tab>/evil.example` is
			// `//evil.example` to it.
			'/\t/evil.example',
			'/\n/evil.example',
			'/\r/evil.example',
			'/kanban\r\nSet-Cookie: a=b',
			'/\u0000',
			'/kanban\u007f',
			'/kanban\u200b',
			'/kanban\u202e',
			'/kanban\u2028',
			'/kanban\ufeff',
			'/has space',
			// Surrounding whitespace is not trimmed away.
			' /kanban',
			'/kanban ',
			'\t/kanban',
			'/kanban\n',
			'   ',
			''
		])('%j', (value) => {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		});

		it('proves the tab case is real: a browser reads it as another host', () => {
			expect(landsOn('/\t/evil.example')).toBe('https://evil.example');
			expect(landsOn('/\\evil.example')).toBe('https://evil.example');
		});
	});

	describe('refuses a dot segment', () => {
		it.each(['/..', '/../kanban', '/kanban/../../settings', '/./kanban', '/kanban/.', '/kanban/..'])(
			'%j',
			(value) => {
				expect(toEverIdStartReturnPath(value)).toBeUndefined();
			}
		);
	});

	it('refuses anything outside the characters a path of this site uses', () => {
		for (const value of ['/<script>', '/kanban"', '/kanban|x', '/känban', '/kanban^', '/{id}', '/kanban`']) {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		}
	});

	it('refuses a path longer than the sign-in carries', () => {
		expect(EVER_ID_START_RETURN_MAX_LENGTH).toBe(512);
		const longest = '/' + 'a'.repeat(EVER_ID_START_RETURN_MAX_LENGTH - 1);
		expect(toEverIdStartReturnPath(longest)).toBe(longest);
		expect(toEverIdStartReturnPath(longest + 'a')).toBeUndefined();
	});

	it('refuses anything that is not a string', () => {
		for (const value of [null, undefined, 42, true, {}, ['/kanban'], () => '/kanban']) {
			expect(toEverIdStartReturnPath(value)).toBeUndefined();
		}
	});
});

describe('readEverIdStartReturnPath: the one `return` value of an address', () => {
	const query = (search: string) => new URL(`${ORIGIN}/api/auth/ever-id/start${search}`).searchParams;

	it('names the key once', () => {
		expect(EVER_ID_START_RETURN_PARAM).toBe('return');
	});

	it('is undefined when the address names no path', () => {
		expect(readEverIdStartReturnPath(query(''))).toBeUndefined();
		expect(readEverIdStartReturnPath(query('?other=/kanban'))).toBeUndefined();
		expect(readEverIdStartReturnPath(query('?return='))).toBeUndefined();
	});

	it('reads a path of this site, written plainly or encoded once as a query value', () => {
		expect(readEverIdStartReturnPath(query('?return=/task/42'))).toBe('/task/42');
		expect(readEverIdStartReturnPath(query('?return=%2Ftask%2F42'))).toBe('/task/42');
		expect(readEverIdStartReturnPath(query('?return=%2Fsettings%2Fteam%3Ftab%3Dmembers%26x%3D1'))).toBe(
			'/settings/team?tab=members&x=1'
		);
	});

	it.each([
		'?return=https://evil.example',
		'?return=https%3A%2F%2Fevil.example',
		'?return=//evil.example',
		'?return=%2F%2Fevil.example',
		'?return=%252F%252Fevil.example',
		'?return=/%252Fevil.example',
		'?return=/%5Cevil.example',
		'?return=%2F%5Cevil.example',
		'?return=/%09/evil.example',
		'?return=%2F%09%2Fevil.example',
		'?return=/a+b'
	])('refuses %s', (search) => {
		expect(readEverIdStartReturnPath(query(search))).toBeUndefined();
	});

	it('refuses a key given twice, whatever the two values are', () => {
		expect(readEverIdStartReturnPath(query('?return=/kanban&return=/settings'))).toBeUndefined();
		expect(readEverIdStartReturnPath(query('?return=/kanban&return=//evil.example'))).toBeUndefined();
	});
});

describe('the return-path cookie: where the sign-in lands afterwards', () => {
	it('the sign-in itself lands where the button lands: the workspace chooser', () => {
		expect(EVER_ID_SIGN_IN_LANDING_PATH).toBe('/auth/workspace');
	});

	it('keeps a checked path for as long as the sign-in lasts, readable by the page that ends it', () => {
		expect(everIdStartReturnCookie('/task/42', true)).toEqual({
			name: 'ever-id-start-return',
			value: '/task/42',
			httpOnly: false,
			sameSite: 'lax',
			secure: true,
			path: '/',
			maxAge: 900
		});
		expect(EVER_ID_START_RETURN_MAX_AGE_S).toBe(15 * 60);
		expect(everIdStartReturnCookie('/task/42', false).secure).toBe(false);
	});

	it('writes it empty when the link names no path: that start then opens the usual page', () => {
		expect(everIdStartReturnCookie(undefined, true)).toMatchObject({
			name: EVER_ID_START_RETURN_COOKIE,
			value: '',
			maxAge: 900
		});
		expect(readEverIdStartReturnCookie(`${EVER_ID_START_RETURN_COOKIE}=`)).toBeUndefined();
	});

	it.each(['/', '/task/42', '/settings/team?tab=members&x=1#invite', '/search?q=a%20b', '/kanban?next=%2Ftask;a,b'])(
		'reads back exactly %s',
		(path) => {
			const { name, value } = everIdStartReturnCookie(path, true);
			// As `NextResponse.cookies.set` writes it: a cookie value holds no `;`, `,` or space.
			const written = encodeURIComponent(value);

			expect(written).not.toMatch(/[;, ]/);
			expect(readEverIdStartReturnCookie(`other=1; ${name}=${written}; last=2`)).toBe(path);
		}
	);

	it('tells a cookie of that exact name, with a path or empty, from any other', () => {
		expect(hasEverIdStartReturnCookie(`a=1; ${EVER_ID_START_RETURN_COOKIE}=; b=2`)).toBe(true);
		expect(hasEverIdStartReturnCookie(`${EVER_ID_START_RETURN_COOKIE}=%2Fkanban`)).toBe(true);
		for (const header of [
			undefined,
			null,
			'',
			'a=1',
			`${EVER_ID_START_RETURN_COOKIE}-x=1`,
			`x-${EVER_ID_START_RETURN_COOKIE}=1`
		]) {
			expect(hasEverIdStartReturnCookie(header)).toBe(false);
		}
	});

	it('reads nothing when there is no such cookie', () => {
		for (const header of [
			undefined,
			null,
			'',
			'other=1',
			'ever-id-start-return-x=%2Ftask',
			'ever-id-start-return'
		]) {
			expect(readEverIdStartReturnCookie(header)).toBeUndefined();
		}
	});

	it('checks the value again, as a link would be checked: anything could have set a cookie of that name', () => {
		for (const value of [
			'https%3A%2F%2Fevil.example',
			'%2F%2Fevil.example',
			'%2F%5Cevil.example',
			'%2F%2509%2Fevil.example',
			'%2F..%2Fsettings',
			'%E0%A4%A',
			'/%',
			''
		]) {
			expect(readEverIdStartReturnCookie(`${EVER_ID_START_RETURN_COOKIE}=${value}`)).toBeUndefined();
		}
	});

	it('takes the first of several values that is a path of this site', () => {
		const name = EVER_ID_START_RETURN_COOKIE;
		expect(readEverIdStartReturnCookie(`${name}=%2F%2Fevil.example; ${name}=%2Fkanban`)).toBe('/kanban');
	});
});
