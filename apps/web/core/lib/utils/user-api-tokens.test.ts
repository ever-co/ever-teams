import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';
import {
	activeUserApiTokenCount,
	canCreateUserApiToken,
	exchangeUrlOf,
	formatUserApiTokenDate,
	MAX_ACTIVE_USER_API_TOKENS,
	sortUserApiTokens,
	userApiTokenExpiryState,
	userApiTokenLastUseState,
	userApiTokenNameProblem
} from './user-api-tokens';

const NOW = new Date('2026-11-14T12:00:00.000Z');

function token(id: string, overrides: Partial<TUserApiToken> = {}): TUserApiToken {
	return {
		id,
		name: `Token ${id}`,
		createdAt: '2026-11-01T09:00:00.000Z',
		expiresAt: null,
		lastUsedAt: null,
		...overrides
	};
}

describe('the ten working tokens a person may hold', () => {
	it('counts the tokens that still work, not the expired ones', () => {
		const tokens = [
			token('a'),
			token('b', { expiresAt: '2027-01-01T00:00:00.000Z' }),
			token('c', { expiresAt: '2026-11-14T11:59:59.000Z' })
		];

		expect(activeUserApiTokenCount(tokens, NOW)).toBe(2);
	});

	it('treats a token expiring right now as expired, as Gauzy does', () => {
		expect(activeUserApiTokenCount([token('a', { expiresAt: NOW.toISOString() })], NOW)).toBe(0);
	});

	it('lets a person create until ten tokens work, expired ones not counting', () => {
		const nine = Array.from({ length: 9 }, (_, index) => token(`t${index}`));
		const ten = [...nine, token('t9')];
		const tenWithOneExpired = [...nine, token('old', { expiresAt: '2026-11-01T00:00:00.000Z' })];

		expect(MAX_ACTIVE_USER_API_TOKENS).toBe(10);
		expect(canCreateUserApiToken(nine, NOW)).toBe(true);
		expect(canCreateUserApiToken(ten, NOW)).toBe(false);
		expect(canCreateUserApiToken(tenWithOneExpired, NOW)).toBe(true);
	});
});

describe('the name of a new token', () => {
	it('is required, once trimmed', () => {
		expect(userApiTokenNameProblem('   ')).toBe('REQUIRED');
		expect(userApiTokenNameProblem('Friday report')).toBeNull();
	});

	it('keeps to 100 characters, spaces around it not counting', () => {
		expect(userApiTokenNameProblem(` ${'x'.repeat(100)} `)).toBeNull();
		expect(userApiTokenNameProblem('x'.repeat(101))).toBe('TOO_LONG');
	});
});

describe('what a row says about a token', () => {
	it('says a token without an end never expires', () => {
		expect(userApiTokenExpiryState(token('a'), NOW)).toEqual({ kind: 'never' });
	});

	it('tells an end still to come from an end already passed', () => {
		const later = token('a', { expiresAt: '2027-02-12T09:00:00.000Z' });
		const passed = token('b', { expiresAt: '2026-11-10T09:00:00.000Z' });

		expect(userApiTokenExpiryState(later, NOW)).toEqual({ kind: 'expires', date: '2027-02-12T09:00:00.000Z' });
		expect(userApiTokenExpiryState(passed, NOW)).toEqual({ kind: 'expired', date: '2026-11-10T09:00:00.000Z' });
	});

	it('says when a token was last used, or that it never was', () => {
		expect(userApiTokenLastUseState(token('a'))).toEqual({ kind: 'never' });
		expect(userApiTokenLastUseState(token('b', { lastUsedAt: '2026-11-13T08:00:00.000Z' }))).toEqual({
			kind: 'used',
			date: '2026-11-13T08:00:00.000Z'
		});
	});

	it('writes a date the way the language writes it, and leaves an unreadable one as it came', () => {
		expect(formatUserApiTokenDate('2026-11-14T12:00:00.000Z', 'en')).toBe('Nov 14, 2026');
		expect(formatUserApiTokenDate('2026-11-14T12:00:00.000Z', 'fr')).toBe('14 nov. 2026');
		expect(formatUserApiTokenDate('not a date', 'en')).toBe('not a date');
	});
});

describe('the order of the list', () => {
	it('puts the working tokens first, newest first, then the expired ones, latest expired first', () => {
		const tokens = [
			token('old-working', { createdAt: '2026-10-01T00:00:00.000Z' }),
			token('expired-long-ago', { expiresAt: '2026-09-01T00:00:00.000Z' }),
			token('new-working', { createdAt: '2026-11-10T00:00:00.000Z' }),
			token('expired-recently', { expiresAt: '2026-11-12T00:00:00.000Z' })
		];

		expect(sortUserApiTokens(tokens, NOW).map((item) => item.id)).toEqual([
			'new-working',
			'old-working',
			'expired-recently',
			'expired-long-ago'
		]);
	});

	it('leaves the list it was given as it was', () => {
		const tokens = [token('a', { createdAt: '2026-01-01T00:00:00.000Z' }), token('b')];

		sortUserApiTokens(tokens, NOW);

		expect(tokens.map((item) => item.id)).toEqual(['a', 'b']);
	});
});

describe('the exchange address a script calls', () => {
	it('is the API address the app calls directly, without a trailing slash', () => {
		expect(exchangeUrlOf('https://api.example.com/')).toBe('https://api.example.com/api/auth/api-token/exchange');
	});

	it('is the route alone when the app calls the API through its own server', () => {
		expect(exchangeUrlOf(undefined)).toBe('/api/auth/api-token/exchange');
		expect(exchangeUrlOf('')).toBe('/api/auth/api-token/exchange');
	});
});
