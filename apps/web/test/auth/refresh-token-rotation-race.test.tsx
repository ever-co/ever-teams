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
import { getAccessTokenCookie, getRefreshTokenCookie, removeAuthCookies } from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { userService } from '@/core/services/client/api/users/user.service';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from './fake-gauzy-page';
import { FAKE_USER, HOUR_MS } from './fake-gauzy-session';
import { installFakeWebLocks } from './fake-web-locks';

const MINUTE_MS = 60 * 1000;
/** The lock the tabs of the browser renew under, one at a time. */
const RENEWAL_LOCK = 'ever-teams.session-renewal';
const CLIENTS = [authService, userService, timerService];

let page: FakeGauzyPage;

/** Lets what is already under way go on: a second renewal, if one was going to be sent, is sent by then. */
const letRequestsLeave = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 60)));

/** The session is the one of the pair: both of its tokens are in the cookies. */
function expectSessionOf(pair: { token: string; refresh_token: string }) {
	expect(page.isSignedOut()).toBe(false);
	expect(getRefreshTokenCookie()).toBe(pair.refresh_token);
	expect(getAccessTokenCookie()).toBe(pair.token);
}

describe('a renewal that loses the race for the refresh token to another tab', () => {
	beforeEach(() => {
		page = openFakeGauzyPage(CLIENTS);
	});
	afterEach(() => page.close());

	it('keeps the session: an explicit renewal takes the pair the other tab stored', async () => {
		const { gauzy } = page;
		const pair = page.signIn();
		gauzy.holdAnswers();

		// This tab's renewal is on its way when another tab renews with the same refresh token, and stores its pair
		const renewal = authService.refreshToken();
		await waitFor(() => expect(gauzy.heldCount()).toBe(1));
		const pairOfOtherTab = gauzy.renewFromAnotherTab(pair.refresh_token);
		page.keepInCookies(pairOfOtherTab);
		gauzy.answerAll();

		await expect(renewal).resolves.toEqual(expect.objectContaining({ id: FAKE_USER.id }));
		expectSessionOf(pairOfOtherTab);
	});

	it('keeps the session: the scheduled renewal takes the pair the other tab stored', async () => {
		const { gauzy } = page;
		const pair = page.signIn();
		// The token is about to expire: the scheduled renewal runs as the page opens
		page.wait(24 * HOUR_MS - 2 * MINUTE_MS);
		gauzy.holdAnswers();

		const { unmount } = renderHook(() => useProactiveTokenRefresh());
		await waitFor(() => expect(gauzy.heldCount()).toBe(1));
		const pairOfOtherTab = gauzy.renewFromAnotherTab(pair.refresh_token);
		page.keepInCookies(pairOfOtherTab);
		gauzy.answerAll();
		await letRequestsLeave();

		expectSessionOf(pairOfOtherTab);
		unmount();
	});

	it('does not keep a pair answered after the person signed out in another tab', async () => {
		const { gauzy } = page;
		page.signIn();
		gauzy.holdAnswers();

		const renewal = authService.refreshToken();
		await waitFor(() => expect(gauzy.heldCount()).toBe(1));
		// The other tab signs out: the cookies every tab shares are gone
		removeAuthCookies();
		gauzy.answerAll();

		await expect(renewal).rejects.toEqual(expect.objectContaining({ status: 401 }));
		expect(getRefreshTokenCookie()).toBeFalsy();
		expect(getAccessTokenCookie()).toBeFalsy();
	});
});

describe('a renewal whose refresh token another one rotated, before that one stored its pair', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		page = openFakeGauzyPage(CLIENTS, { clock: 'jest timers' });
	});
	afterEach(() => {
		page.close();
		jest.useRealTimers();
	});

	it('waits for that pair, and takes it', async () => {
		const { gauzy } = page;
		const pair = page.signIn();

		// A page loads in another tab: the server renews there, and its answer is still on its way to the browser
		const pairOfOtherTab = gauzy.renewFromAnotherTab(pair.refresh_token);
		const renewal = authService.refreshToken();
		await jest.advanceTimersByTimeAsync(2_000);
		page.keepInCookies(pairOfOtherTab);
		await jest.advanceTimersByTimeAsync(500);

		await expect(renewal).resolves.toEqual(expect.objectContaining({ id: FAKE_USER.id }));
		expectSessionOf(pairOfOtherTab);
	});

	it('ends the session when no pair ever shows up: the answer of the other renewal was lost', async () => {
		const { gauzy } = page;
		const pair = page.signIn();
		gauzy.renewFromAnotherTab(pair.refresh_token);

		const renewal = authService.refreshToken();
		const outcome = expect(renewal).rejects.toEqual(expect.objectContaining({ status: 401 }));
		await jest.advanceTimersByTimeAsync(11_000);

		await outcome;
	});
});

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

describe('two tabs that renew together, in a browser with Web Locks', () => {
	let locks: ReturnType<typeof installFakeWebLocks>;

	beforeEach(() => {
		jest.useFakeTimers();
		page = openFakeGauzyPage(CLIENTS, { clock: 'jest timers' });
		locks = installFakeWebLocks();
	});
	afterEach(() => {
		locks.remove();
		page.close();
		jest.useRealTimers();
	});

	it('renew one at a time: the tab that waited finds the new pair and sends nothing', async () => {
		const { gauzy } = page;
		const pair = page.signIn();
		gauzy.runTimer();
		jest.setSystemTime(Date.now() + 25 * HOUR_MS);

		// The other tab renews first, and holds the lock while it does
		const otherTabIsDone = locks.holdFromAnotherTab(RENEWAL_LOCK);
		const stop = timerService.stopTimer({ source: ETimeLogSource.TEAMS });
		await jest.advanceTimersByTimeAsync(1_000);
		expect(page.renewals()).toBe(0);
		const pairOfOtherTab = gauzy.renewFromAnotherTab(pair.refresh_token);
		page.keepInCookies(pairOfOtherTab);
		otherTabIsDone();
		await jest.advanceTimersByTimeAsync(1_000);

		// This tab's stop, refused with the expired token, went through with the other tab's pair
		expect((await stop).data.running).toBe(false);
		expect(page.renewals()).toBe(0);
		expectSessionOf(pairOfOtherTab);
	});

	it('does not wait for ever for a tab that keeps the lock: it renews on its own after a while', async () => {
		const { gauzy } = page;
		page.signIn();
		locks.holdFromAnotherTab(RENEWAL_LOCK);

		const renewal = authService.refreshToken();
		await jest.advanceTimersByTimeAsync(14_000);
		expect(page.renewals()).toBe(0);
		await jest.advanceTimersByTimeAsync(2_000);

		await expect(renewal).resolves.toEqual(expect.objectContaining({ id: FAKE_USER.id }));
		expect(page.renewals()).toBe(1);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
	});
});
