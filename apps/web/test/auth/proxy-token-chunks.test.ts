/**
 * proxy() rebuilds a long access token from the chunks the sign-in writes (`auth-token0..N` plus
 * `auth-token_totalChunks`). The count comes from a client cookie and is read on every page before any
 * authentication, so it must be bounded: an unbounded count sized a loop (and one log line per missing chunk),
 * run twice, which let one anonymous request block the server's event loop for every user.
 */
import { NextRequest } from 'next/server';
import { currentAuthenticatedUserRequest } from '@/core/services/server/requests/auth';
import { MAX_TOKEN_COOKIE_CHUNKS } from '@/core/lib/helpers/cookies/token-chunks';
import { proxy } from '@/proxy';

jest.mock('next-intl/middleware', () => ({
	__esModule: true,
	default: jest.fn(() => jest.fn(() => new Response(null)))
}));
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
}));

const mockCurrentUser = currentAuthenticatedUserRequest as jest.Mock;

/** An access token that decodes and is valid for an hour (proxy() only decodes it locally). */
function accessToken(): string {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: 'user-1', iat: now, exp: now + 3600 })}.signature`;
}

function pageRequest(cookie: string): NextRequest {
	return new NextRequest('http://localhost:3030/', { headers: { cookie } });
}

let consoleWarn: jest.SpyInstance;

beforeEach(() => {
	mockCurrentUser.mockResolvedValue({ response: { ok: true }, data: { id: 'user-1' } });
	consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	jest.spyOn(console, 'log').mockImplementation(() => undefined);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('proxy() and the chunked access token', () => {
	it('rebuilds a token split across chunk cookies', async () => {
		const token = accessToken();
		const half = Math.ceil(token.length / 2);

		await proxy(
			pageRequest(
				`auth-token_totalChunks=2; auth-token0=${token.slice(0, half)}; auth-token1=${token.slice(half)}`
			)
		);

		expect(mockCurrentUser).toHaveBeenCalledWith({ bearer_token: token });
	});

	it.each(['100000000', String(MAX_TOKEN_COOKIE_CHUNKS + 1), '1e9', '-5', 'abc'])(
		'treats a chunk count of %s as no token, without iterating over it',
		async (count) => {
			const started = Date.now();

			const response = await proxy(pageRequest(`auth-token_totalChunks=${count}`));

			// The page is protected and no token was sent: the visitor is sent to sign in
			expect(response.status).toBe(307);
			expect(response.headers.get('location')).toMatch(/\/auth\/pass(code|word)$/);
			expect(mockCurrentUser).not.toHaveBeenCalled();
			expect(consoleWarn.mock.calls.length).toBeLessThan(5);
			expect(Date.now() - started).toBeLessThan(1000);
		}
	);

	it('does not rebuild a token when a chunk is missing', async () => {
		await proxy(pageRequest('auth-token_totalChunks=3; auth-token0=aaa; auth-token2=ccc'));

		expect(mockCurrentUser).not.toHaveBeenCalled();
	});
});
