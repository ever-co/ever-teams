// cspell:ignore KHTML
/**
 * The proxy renews a session on the server when a page loads with an expired access token. Gauzy records the user
 * agent of the request that renews a session, and names the session's device with it in Settings > Profile >
 * Sessions: the renewal carries the browser's, not this server's own ("node", an unknown device). ever-co/ever-gauzy#11983.
 */
import { NextRequest } from 'next/server';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
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
const mockRefresh = refreshTokenRequest as jest.Mock;
const CHROME =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** An access token that decodes, valid for `validFor` seconds (expired when negative). */
function accessToken(validFor: number): string {
	const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: 'user-1', iat: now - 60, exp: now + validFor })}.signature`;
}

beforeEach(() => {
	mockCurrentUser.mockResolvedValue({ response: { ok: true }, data: { id: 'user-1' } });
	mockRefresh.mockResolvedValue({ data: { token: accessToken(3600), refresh_token: 'rotated-refresh-token' } });
	jest.spyOn(console, 'log').mockImplementation(() => undefined);
	jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
});

it("renews an expired session with the browser's user agent", async () => {
	await proxy(
		new NextRequest('http://localhost:3030/', {
			headers: {
				cookie: `auth-token=${accessToken(-3600)}; auth-refresh-token=refresh-token`,
				'user-agent': CHROME
			}
		})
	);

	expect(mockRefresh).toHaveBeenCalledWith('refresh-token', CHROME);
});
