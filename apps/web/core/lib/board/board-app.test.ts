/**
 * The Board app's address carries the Ever Teams origin it was opened from, and the two ways back from the Board (the
 * sign-in redirect and the session route's CORS) trust the origin of NEXT_PUBLIC_BOARD_APP_DOMAIN only, exactly, and
 * only over https (plain http for localhost in development). A redirect parameter must never become an open redirect.
 */
import {
	BOARD_EVER_TEAMS_ORIGIN_PARAM,
	type BoardTrust,
	boardAppUrl,
	boardReturnUrl,
	boardSessionUser,
	configuredBoardTrust,
	isTrustedBoardOrigin,
	trustedBoardOrigin,
	withEverTeamsOrigin
} from './board-app';

const BOARD: BoardTrust = { boardAppDomain: 'https://board.ever.team', allowLocalhostHttp: false };
const LOCAL_BOARD: BoardTrust = { boardAppDomain: 'http://localhost:3000', allowLocalhostHttp: true };
const BACKSLASH = String.fromCharCode(92);
// Characters that pass for a Latin o and for a full stop, spelled out so the test reads as what it checks
const CYRILLIC_O = String.fromCharCode(0x43e);
const IDEOGRAPHIC_FULL_STOP = String.fromCharCode(0x3002);

const ORIGINAL_ENV = process.env;

afterEach(() => {
	process.env = ORIGINAL_ENV;
});

describe('trustedBoardOrigin', () => {
	it('is the origin of NEXT_PUBLIC_BOARD_APP_DOMAIN, without its path', () => {
		expect(trustedBoardOrigin(BOARD)).toBe('https://board.ever.team');
		expect(trustedBoardOrigin({ boardAppDomain: ' https://BOARD.example.com:443/boards/ ' })).toBe(
			'https://board.example.com'
		);
		expect(trustedBoardOrigin({ boardAppDomain: 'https://board.example.com:8443' })).toBe(
			'https://board.example.com:8443'
		);
	});

	it.each([undefined, null, '', '   ', 'board.ever.team', '//board.ever.team', 'not a url'])(
		'trusts nothing when the setting is %p',
		(boardAppDomain) => {
			expect(trustedBoardOrigin({ boardAppDomain })).toBeNull();
		}
	);

	it('trusts no plain http Board outside local development', () => {
		expect(trustedBoardOrigin({ boardAppDomain: 'http://board.example.com' })).toBeNull();
		expect(trustedBoardOrigin({ boardAppDomain: 'http://board.example.com', allowLocalhostHttp: true })).toBeNull();
		expect(trustedBoardOrigin({ boardAppDomain: 'http://localhost:3000', allowLocalhostHttp: false })).toBeNull();
	});

	it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'])(
		'trusts %s over http in local development',
		(boardAppDomain) => {
			expect(trustedBoardOrigin({ boardAppDomain, allowLocalhostHttp: true })).toBe(boardAppDomain);
		}
	);

	it.each(['ftp://board.example.com', 'wss://board.example.com', 'https://user:secret@board.example.com'])(
		'trusts no Board configured as %s',
		(boardAppDomain) => {
			expect(trustedBoardOrigin({ boardAppDomain })).toBeNull();
		}
	);
});

describe('configuredBoardTrust', () => {
	it('reads NEXT_PUBLIC_BOARD_APP_DOMAIN from the runtime env, and allows local http in development only', () => {
		process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: 'https://board.example.org' };
		expect(configuredBoardTrust()).toEqual({
			boardAppDomain: 'https://board.example.org',
			allowLocalhostHttp: false
		});

		process.env = {
			...ORIGINAL_ENV,
			NODE_ENV: 'development',
			NEXT_PUBLIC_BOARD_APP_DOMAIN: 'http://localhost:3000'
		};
		expect(configuredBoardTrust()).toEqual({ boardAppDomain: 'http://localhost:3000', allowLocalhostHttp: true });
		expect(trustedBoardOrigin()).toBe('http://localhost:3000');
	});
});

describe('isTrustedBoardOrigin', () => {
	it('accepts the Board origin exactly as a browser sends it', () => {
		expect(isTrustedBoardOrigin('https://board.ever.team', BOARD)).toBe(true);
	});

	it.each([
		null,
		undefined,
		'',
		'null',
		'https://board.ever.team/',
		'http://board.ever.team',
		'https://board.ever.team:8443',
		'https://board.ever.team.evil.example',
		'https://evilboard.ever.team',
		'https://app.ever.team',
		'HTTPS://BOARD.EVER.TEAM'
	])('refuses the origin %p', (origin) => {
		expect(isTrustedBoardOrigin(origin, BOARD)).toBe(false);
	});

	it('refuses every origin when no Board is configured', () => {
		expect(isTrustedBoardOrigin('https://board.ever.team', { boardAppDomain: '' })).toBe(false);
		expect(isTrustedBoardOrigin('null', { boardAppDomain: 'not a url' })).toBe(false);
	});
});

describe('boardReturnUrl', () => {
	it('accepts an address on the Board origin, with its path, query and fragment', () => {
		const address = 'https://board.ever.team/?live=true&origin=https%3A%2F%2Fdemo.ever.team#room=abc,key';

		expect(boardReturnUrl(address, BOARD)).toBe(address);
	});

	it('answers the parsed address, never the raw text', () => {
		expect(boardReturnUrl(' HTTPS://BOARD.EVER.TEAM:443/Room ', BOARD)).toBe('https://board.ever.team/Room');
		expect(boardReturnUrl(`https://board.ever.team${BACKSLASH}@evil.example/`, BOARD)).toBe(
			'https://board.ever.team/@evil.example/'
		);
	});

	it('accepts http on localhost in local development only', () => {
		expect(boardReturnUrl('http://localhost:3000/?live=true', LOCAL_BOARD)).toBe(
			'http://localhost:3000/?live=true'
		);
		expect(boardReturnUrl('http://localhost:3000/', { ...LOCAL_BOARD, allowLocalhostHttp: false })).toBeNull();
		expect(boardReturnUrl('http://localhost:3001/', LOCAL_BOARD)).toBeNull();
	});

	it.each([
		['another host', 'https://evil.example/'],
		['the Ever Teams app itself', 'https://app.ever.team/'],
		['a look-alike subdomain', 'https://board.ever.team.evil.example/'],
		['a look-alike prefix', 'https://evilboard.ever.team/'],
		['a homograph host', `https://b${CYRILLIC_O}ard.ever.team/`],
		['a trailing-dot host', 'https://board.ever.team./'],
		['an ideographic full stop', `https://board.ever.team${IDEOGRAPHIC_FULL_STOP}evil.example/`],
		['another port', 'https://board.ever.team:8443/'],
		['plain http in production', 'http://board.ever.team/'],
		['a protocol-relative address', '//evil.example/x'],
		['a protocol-relative Board address', '//board.ever.team/x'],
		['a relative path', '/settings'],
		['backslashes', `${BACKSLASH}${BACKSLASH}evil.example/x`],
		['a slash and a backslash', `/${BACKSLASH}evil.example/`],
		['a backslash scheme trick', `https:${BACKSLASH}${BACKSLASH}evil.example/`],
		['a backslash user trick', `https://evil.example${BACKSLASH}@board.ever.team/`],
		['the Board host as a user name', 'https://board.ever.team@evil.example/'],
		['a user name in front of the Board', 'https://evil.example@board.ever.team/'],
		['a user name and password', 'https://user:secret@board.ever.team/'],
		['an encoded at sign', 'https://board.ever.team%40evil.example/'],
		['the Board host after a fragment', 'https://evil.example#@board.ever.team'],
		['the Board host after a query', 'https://evil.example?@board.ever.team'],
		['javascript:', 'javascript:alert(document.cookie)'],
		['javascript: in mixed case', 'JaVaScRiPt:alert(1)'],
		['javascript: split by a tab', 'java\tscript:alert(1)'],
		['data:', 'data:text/html,<script>alert(1)</script>'],
		['blob: on the Board origin', 'blob:https://board.ever.team/0b9b8c7e'],
		['wss: on the Board host', 'wss://board.ever.team/'],
		['ftp: on the Board host', 'ftp://board.ever.team/'],
		['an empty value', ''],
		['an address far too long', `https://board.ever.team/?pad=${'a'.repeat(9000)}`]
	])('refuses %s', (_label, candidate) => {
		expect(boardReturnUrl(candidate, BOARD)).toBeNull();
	});

	it.each([null, undefined, 42, ['https://board.ever.team/'], { href: 'https://board.ever.team/' }])(
		'refuses the non-text value %p',
		(candidate) => {
			expect(boardReturnUrl(candidate, BOARD)).toBeNull();
		}
	);

	it('refuses every address when no secure Board is configured', () => {
		expect(boardReturnUrl('https://board.ever.team/', { boardAppDomain: '' })).toBeNull();
		expect(boardReturnUrl('http://board.example.com/', { boardAppDomain: 'http://board.example.com' })).toBeNull();
	});
});

describe('boardAppUrl', () => {
	it('names the Ever Teams origin the Board is opened from', () => {
		const url = boardAppUrl('https://board.ever.team', 'https://demo.ever.team');

		expect(url?.origin).toBe('https://board.ever.team');
		expect(url?.searchParams.get(BOARD_EVER_TEAMS_ORIGIN_PARAM)).toBe('https://demo.ever.team');
	});

	it('names the origin only, never the page the person is on', () => {
		const url = boardAppUrl('https://board.ever.team', 'https://app.ever.team/settings/team?tab=members#danger');

		expect(url?.searchParams.get(BOARD_EVER_TEAMS_ORIGIN_PARAM)).toBe('https://app.ever.team');
	});

	it('keeps the path and query of the setting', () => {
		const url = boardAppUrl(' https://teams.example.com/board/?theme=dark ', 'http://localhost:3030');

		expect(url?.toString()).toBe(
			'https://teams.example.com/board/?theme=dark&origin=http%3A%2F%2Flocalhost%3A3030'
		);
	});

	it.each([undefined, null, '', 'null', 'about:blank', 'app://ever-teams', 'not a url'])(
		'adds no origin for %p',
		(everTeamsOrigin) => {
			const url = boardAppUrl('https://board.ever.team', everTeamsOrigin);

			expect(url?.toString()).toBe('https://board.ever.team/');
		}
	);

	it.each([undefined, null, '', ' ', 'board.ever.team', 'javascript:alert(1)', 'ftp://board.ever.team'])(
		'is null when NEXT_PUBLIC_BOARD_APP_DOMAIN is %p',
		(boardAppDomain) => {
			expect(boardAppUrl(boardAppDomain, 'https://app.ever.team')).toBeNull();
		}
	);

	it('is null for a Board this deployment would not trust, which could not check the session nor be returned to', () => {
		expect(
			boardAppUrl('http://board.ever.team', 'https://app.ever.team', { allowLocalhostHttp: false })
		).toBeNull();
		expect(boardAppUrl('https://user@board.ever.team', 'https://app.ever.team')).toBeNull();
		expect(boardAppUrl('http://localhost:3000', 'http://localhost:3030', { allowLocalhostHttp: false })).toBeNull();
		expect(
			boardAppUrl('http://localhost:3000', 'http://localhost:3030', { allowLocalhostHttp: true })?.origin
		).toBe('http://localhost:3000');
	});

	it('withEverTeamsOrigin adds the origin to an address built elsewhere, before its fragment', () => {
		const url = withEverTeamsOrigin(new URL('https://board.ever.team/#json=id,key'), 'https://stage.ever.team');

		expect(url.toString()).toBe('https://board.ever.team/?origin=https%3A%2F%2Fstage.ever.team#json=id,key');
	});
});

describe('boardSessionUser', () => {
	it('keeps the id, the name and the picture only', () => {
		const user = {
			id: 'user-1',
			name: 'Ada Lovelace',
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
			imageUrl: 'https://cdn.example.com/ada.png',
			tenantId: 'tenant-1',
			role: { name: 'ADMIN' }
		};

		expect(boardSessionUser(user)).toEqual({
			id: 'user-1',
			name: 'Ada Lovelace',
			imageUrl: 'https://cdn.example.com/ada.png'
		});
	});

	it('builds the name from the first and last names when the API sent none', () => {
		expect(boardSessionUser({ id: 'user-2', firstName: 'Grace', lastName: ' ', imageUrl: '' })).toEqual({
			id: 'user-2',
			name: 'Grace',
			imageUrl: null
		});
	});

	it("takes the picture of the person's image asset when the API sent no imageUrl", () => {
		expect(
			boardSessionUser({
				id: 'user-3',
				name: 'Ada',
				image: { fullUrl: 'https://cdn.example.com/full.png', thumbUrl: 'https://cdn.example.com/thumb.png' }
			}).imageUrl
		).toBe('https://cdn.example.com/full.png');
		expect(
			boardSessionUser({ id: 'user-3', image: { fullUrl: '', thumbUrl: 'https://cdn.example.com/thumb.png' } })
				.imageUrl
		).toBe('https://cdn.example.com/thumb.png');
		expect(boardSessionUser({ id: 'user-3', image: 'not an asset' }).imageUrl).toBeNull();
	});

	it('answers empty text for fields of the wrong type', () => {
		expect(boardSessionUser({ id: 7, name: { first: 'x' }, imageUrl: 3 })).toEqual({
			id: '',
			name: '',
			imageUrl: null
		});
	});
});
