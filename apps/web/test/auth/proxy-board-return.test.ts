/**
 * The Board app's sign-in link is `<ever teams>/auth/passcode?redirect=<board address>`. Someone already signed in
 * here goes straight back to the Board, but only to the Board origin this deployment trusts, and only on a session the
 * API confirms (after refreshing an expired access token, whose new cookies go along): the Board checks the session
 * itself, so a token that merely looks valid would bounce the person between the two. Any other `redirect` is
 * ignored, as before: a signed-in visitor lands in the app.
 */
import { NextRequest, NextResponse } from 'next/server';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { proxy } from '@/proxy';

jest.mock('next-intl/middleware', () => ({
	__esModule: true,
	default: jest.fn(() => jest.fn(() => NextResponse.next()))
}));
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
}));

const mockCurrentUser = currentAuthenticatedUserRequest as jest.Mock;
const mockRefresh = refreshTokenRequest as jest.Mock;
const ORIGINAL_ENV = process.env;
const BOARD_ADDRESS = 'https://board.ever.team/?live=true&origin=https%3A%2F%2Fapp.ever.team#room=abc,key';

/** An access token that decodes locally, valid for an hour, or expired an hour ago. */
function accessToken(validFor = 3600, id = 'user-1'): string {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id, iat: now - 7200, exp: now + validFor })}.signature`;
}

function signInRequest(redirect: string | null, cookie = `auth-token=${accessToken()}`): NextRequest {
	const query = redirect === null ? '' : `?redirect=${encodeURIComponent(redirect)}`;
	return new NextRequest(`https://app.ever.team/auth/passcode${query}`, { headers: cookie ? { cookie } : {} });
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_BOARD_APP_DOMAIN: 'https://board.ever.team' };
	mockCurrentUser.mockResolvedValue({ response: { ok: true }, data: { id: 'user-1' } });
	jest.spyOn(console, 'log').mockImplementation(() => undefined);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	process.env = ORIGINAL_ENV;
	jest.useRealTimers();
	jest.restoreAllMocks();
});

describe('proxy() on a sign-in page the Board app sent a signed-in person to', () => {
	it('sends them back to the Board address, on a session the API confirms', async () => {
		const response = await proxy(signInRequest(BOARD_ADDRESS));

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe(BOARD_ADDRESS);
		expect(mockCurrentUser).toHaveBeenCalledWith({
			bearer_token: expect.any(String),
			signal: expect.any(AbortSignal)
		});
	});

	it.each([
		'https://evil.example/',
		'//evil.example/',
		'javascript:alert(1)',
		'https://board.ever.team@evil.example/',
		'https://board.ever.team.evil.example/',
		'http://board.ever.team/'
	])('ignores the address %s and opens the app, as for any signed-in visit', async (address) => {
		const response = await proxy(signInRequest(address));

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('https://app.ever.team/');
	});

	it('opens the app when no Board app is configured', async () => {
		process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN = '';

		const response = await proxy(signInRequest(BOARD_ADDRESS));

		expect(response.headers.get('location')).toBe('https://app.ever.team/');
	});

	it('shows the sign-in page when the API refuses a token that looks valid, instead of bouncing to the Board', async () => {
		mockCurrentUser.mockRejectedValue({ statusCode: 401, message: 'Unauthorized' });

		const response = await proxy(signInRequest(BOARD_ADDRESS));

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
	});

	it('refreshes an expired access token and sends the new cookies along to the Board', async () => {
		const freshToken = accessToken(3600, 'user-1-fresh');
		mockRefresh.mockResolvedValue({ data: { token: freshToken, refresh_token: 'rotated-refresh-token' } });

		const response = await proxy(
			signInRequest(BOARD_ADDRESS, `auth-token=${accessToken(-3600)}; auth-refresh-token=refresh-token`)
		);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe(BOARD_ADDRESS);
		expect(mockRefresh).toHaveBeenCalledWith('refresh-token');
		expect(response.cookies.get('auth-token')?.value).toBe(freshToken);
		expect(response.cookies.get('auth-refresh-token')?.value).toBe('rotated-refresh-token');
	});

	it('shows the sign-in page when the access token expired and the refresh is refused', async () => {
		mockRefresh.mockRejectedValue({ statusCode: 401, message: 'Unauthorized' });

		const response = await proxy(
			signInRequest(BOARD_ADDRESS, `auth-token=${accessToken(-3600)}; auth-refresh-token=refresh-token`)
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
	});

	it('shows the sign-in page to someone signed out, who then signs in and returns to the Board', async () => {
		const response = await proxy(signInRequest(BOARD_ADDRESS, ''));

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
		expect(mockCurrentUser).not.toHaveBeenCalled();
	});

	it('sends them back from a sign-in page with a locale prefix too', async () => {
		const request = new NextRequest(
			`https://app.ever.team/fr/auth/passcode?redirect=${encodeURIComponent(BOARD_ADDRESS)}`,
			{ headers: { cookie: `auth-token=${accessToken()}` } }
		);

		const response = await proxy(request);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe(BOARD_ADDRESS);
	});

	it('shows the sign-in page when the API does not confirm the session in time, instead of hanging', async () => {
		jest.useFakeTimers();
		mockCurrentUser.mockReturnValue(new Promise(() => undefined));

		const pending = proxy(signInRequest(BOARD_ADDRESS));
		await jest.advanceTimersByTimeAsync(8_000);
		const response = await pending;
		jest.useRealTimers();

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
	});

	// Gauzy rotates the refresh token: a page sent before the refresh answers would leave the browser a dead one
	it('waits for a token refresh already sent when the deadline passes, and gives the browser the rotated pair', async () => {
		jest.useFakeTimers();
		const freshToken = accessToken(3600, 'user-1-fresh');
		mockRefresh.mockReturnValue(
			new Promise((resolve) =>
				setTimeout(
					() => resolve({ data: { token: freshToken, refresh_token: 'rotated-refresh-token' } }),
					9_000
				)
			)
		);
		mockCurrentUser.mockReturnValue(new Promise(() => undefined));

		let answered = false;
		const pending = proxy(
			signInRequest(BOARD_ADDRESS, `auth-token=${accessToken(-3600)}; auth-refresh-token=refresh-token`)
		).finally(() => (answered = true));
		await jest.advanceTimersByTimeAsync(8_000);
		expect(answered).toBe(false);

		await jest.advanceTimersByTimeAsync(1_000);
		const response = await pending;

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
		expect(response.cookies.get('auth-token')?.value).toBe(freshToken);
		expect(response.cookies.get('auth-refresh-token')?.value).toBe('rotated-refresh-token');
	});

	it('still opens the sign-in page, 15 s past the deadline, when a token refresh sent never answers', async () => {
		jest.useFakeTimers();
		mockRefresh.mockReturnValue(new Promise(() => undefined));

		let answered = false;
		const pending = proxy(
			signInRequest(BOARD_ADDRESS, `auth-token=${accessToken(-3600)}; auth-refresh-token=refresh-token`)
		).finally(() => (answered = true));
		await jest.advanceTimersByTimeAsync(22_000);
		expect(answered).toBe(false);

		await jest.advanceTimersByTimeAsync(1_000);
		const response = await pending;

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
	});

	it('starts no token refresh once the deadline has passed', async () => {
		jest.useFakeTimers();
		// The API refuses the session check at 5.5 s and fails the first refresh at 7.9 s: its retry would come at 8 s
		mockCurrentUser.mockReturnValue(
			new Promise((_, reject) => setTimeout(() => reject({ statusCode: 503, message: 'Unavailable' }), 5_500))
		);
		mockRefresh.mockReturnValue(
			new Promise((_, reject) => setTimeout(() => reject({ statusCode: 500, message: 'Server error' }), 7_900))
		);

		const pending = proxy(
			signInRequest(BOARD_ADDRESS, `auth-token=${accessToken()}; auth-refresh-token=refresh-token`)
		);
		await jest.advanceTimersByTimeAsync(9_000);
		const response = await pending;

		expect(response.status).toBe(200);
		expect(response.headers.get('location')).toBeNull();
		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});
});
