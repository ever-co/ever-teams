/**
 * The Ever Platform route handlers read the person's token and tenant straight from the request's
 * Cookie header: one cookie, or the chunks the sign-in writes for a long token.
 */
import { routeSession } from './route-helpers';

const withCookies = (cookie?: string) =>
	new Request('https://teams.example.test/api/ever-stats/status', cookie ? { headers: { cookie } } : undefined);

describe('routeSession', () => {
	it('answers null without a token', () => {
		expect(routeSession(withCookies())).toBeNull();
		expect(routeSession(withCookies('auth-tenant-id=tenant-1'))).toBeNull();
	});

	it('reads the token and the tenant', () => {
		expect(routeSession(withCookies('auth-token=abc.def.ghi; auth-tenant-id=tenant-1'))).toEqual({
			bearer: 'abc.def.ghi',
			tenantId: 'tenant-1'
		});
	});

	it('joins a chunked token, and refuses one with a missing chunk', () => {
		expect(routeSession(withCookies('auth-token_totalChunks=2; auth-token0=abc.; auth-token1=def')))?.toEqual({
			bearer: 'abc.def',
			tenantId: null
		});
		expect(routeSession(withCookies('auth-token_totalChunks=2; auth-token0=abc.'))).toBeNull();
	});

	it('decodes an encoded value', () => {
		expect(routeSession(withCookies('auth-token=a%2Bb'))?.bearer).toBe('a+b');
	});
});
