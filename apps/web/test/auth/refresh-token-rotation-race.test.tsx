/** @jest-environment jsdom */
/**
 * Gauzy rotates the refresh token: `POST /auth/refresh-token` answers a new pair, and the refresh token it was given
 * is refused from then on (401 "Token is rotated"). Every tab of a browser shares one refresh token, in a cookie.
 *
 * So two renewals sent with the same refresh token, by two tabs or by two flows of one tab, cannot both succeed. The
 * loser's 401 does not mean the session ended: the winner's pair is in the cookies, or on its way there. It used to
 * be read as an ended session: the loser removed the cookies, the winner's fresh pair with them, and every tab was
 * signed out.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set, and a short start delay
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' },
	INIT_DELAY_MS: 10
}));
jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));

import { useProactiveTokenRefresh } from '@/core/hooks/auth/use-proactive-token-refresh';
import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { userService } from '@/core/services/client/api/users/user.service';
import { openFakeGauzyPage, type FakeGauzyPage } from './fake-gauzy-page';
import { FAKE_USER, HOUR_MS } from './fake-gauzy-session';

const MINUTE_MS = 60 * 1000;
const CLIENTS = [authService, userService];

let page: FakeGauzyPage;

/** Lets what is already under way go on: a second renewal, if one was going to be sent, is sent by then. */
const letRequestsLeave = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 60)));

describe('two renewals started together in one tab', () => {
	beforeEach(() => {
		page = openFakeGauzyPage(CLIENTS);
	});
	afterEach(() => page.close());

	it('send the refresh token once: the scheduled renewal and an explicit one share the request', async () => {
		const { gauzy } = page;
		page.signIn();
		page.wait(24 * HOUR_MS - 2 * MINUTE_MS);
		gauzy.holdAnswers();

		const { unmount } = renderHook(() => useProactiveTokenRefresh());
		await waitFor(() => expect(gauzy.heldCount()).toBe(1));
		// What a team creation, or an accepted invitation, asks for while the scheduled renewal is under way
		const renewal = authService.refreshToken();
		await letRequestsLeave();

		expect(page.renewals()).toBe(1);

		gauzy.answerAll();
		await expect(renewal).resolves.toEqual(expect.objectContaining({ id: FAKE_USER.id }));
		await letRequestsLeave();
		expect(page.isSignedOut()).toBe(false);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
		expect(gauzy.acceptsAccessToken(getAccessTokenCookie())).toBe(true);
		unmount();
	});
});
