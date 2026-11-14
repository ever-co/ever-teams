/** @jest-environment jsdom */
/**
 * The session is renewed ahead of time, once the access token is past half of its lifetime, so that no request leaves
 * with an expired token. That renewal must not depend on the person staying on one page, on the network being there
 * at the planned minute, or on the computer staying awake.
 *
 * It did: each page change planned it again from zero, so for someone who navigates it only ran at the very second
 * the token expired; a renewal that failed during an outage ended the schedule for good; and nothing looked at the
 * token again when the connection or the computer came back.
 */
import { act, renderHook } from '@testing-library/react';

let mockPathname = '/';

// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set, and a short start delay
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' },
	INIT_DELAY_MS: 10
}));
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));

import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { userService } from '@/core/services/client/api/users/user.service';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { HOUR_MS, type FakeGauzyOptions } from '@/test/auth/fake-gauzy-session';
import { useProactiveTokenRefresh } from './use-proactive-token-refresh';

const MINUTE_MS = 60 * 1000;

let page: FakeGauzyPage;

/** Time passes with the page's timers running: each look at the token is made. */
const pass = (milliseconds: number) => act(async () => jest.advanceTimersByTimeAsync(milliseconds));

/** Time passes at once, as for a computer that sleeps: the clock moves on and no timer of the page runs. */
const skip = (milliseconds: number) => jest.setSystemTime(Date.now() + milliseconds);

/** A browser whose Gauzy gives tokens of these lifetimes, with Jest moving the time. */
function openBrowser(gauzy?: FakeGauzyOptions) {
	jest.useFakeTimers();
	mockPathname = '/';
	page = openFakeGauzyPage([authService, userService], { clock: 'jest timers', gauzy });
}

/** The app's root layout, where the renewal is mounted for every page. */
async function openApp() {
	const app = renderHook(() => useProactiveTokenRefresh());
	await pass(MINUTE_MS);
	return app;
}

async function goToPage(app: Awaited<ReturnType<typeof openApp>>, pathname: string) {
	mockPathname = pathname;
	app.rerender();
	await pass(MINUTE_MS);
}

/** Whether the session's tokens are ones the API accepts now. */
const isSessionGood = () =>
	page.gauzy.acceptsAccessToken(getAccessTokenCookie()) && page.gauzy.acceptsRefreshToken(getRefreshTokenCookie());

afterEach(() => {
	page.close();
	jest.clearAllTimers();
	jest.useRealTimers();
});

describe('the renewal ahead of time, for a token that lives a day', () => {
	it('runs at half the lifetime, however many pages the person opened meanwhile', async () => {
		openBrowser();
		page.signIn();
		const app = await openApp();

		// A working day: a page change every hour, the last one eleven hours in
		for (let hour = 1; hour <= 11; hour += 1) {
			skip(HOUR_MS - MINUTE_MS);
			await goToPage(app, `/task/${hour}`);
		}
		expect(page.renewals()).toBe(0);
		// Half the lifetime is reached an hour later, on the page the person stayed on
		skip(HOUR_MS);
		await pass(MINUTE_MS);

		expect(page.renewals()).toBe(1);
		expect(isSessionGood()).toBe(true);
		expect(page.isSignedOut()).toBe(false);
		app.unmount();
	});

	it('runs at once for a page opened past half the lifetime, instead of waiting for the expiry', async () => {
		openBrowser();
		page.signIn();
		skip(13 * HOUR_MS);

		const app = await openApp();

		expect(page.renewals()).toBe(1);
		expect(page.isSignedOut()).toBe(false);
		app.unmount();
	});

	it('leaves alone a token another tab renewed meanwhile', async () => {
		openBrowser();
		const pair = page.signIn();
		const app = await openApp();
		skip(12 * HOUR_MS);

		// Another tab reaches half the lifetime first
		page.keepInCookies(page.gauzy.renewFromAnotherTab(pair.refresh_token));
		await pass(10 * MINUTE_MS);

		expect(page.renewals()).toBe(0);
		app.unmount();
	});

	it('does not renew at every look when the computer clock runs far ahead of the API', async () => {
		// Every token the API issues looks past half of its lifetime to this computer
		openBrowser({ serverClockOffsetMs: -20 * HOUR_MS });
		page.signIn();

		const app = await openApp();
		await pass(30 * MINUTE_MS);

		// One renewal as the page opens, then one per ten minutes at most: not one per minute
		expect(page.renewals()).toBeGreaterThanOrEqual(1);
		expect(page.renewals()).toBeLessThanOrEqual(4);
		expect(page.isSignedOut()).toBe(false);
		app.unmount();
	});
});

describe('the renewal after the planned time was missed, for a token that lives twenty minutes', () => {
	// Due ten minutes after it was issued
	const shortTokens = { accessLifetimeMs: 20 * MINUTE_MS };

	it('runs when the connection is back after an outage that outlasted the token', async () => {
		openBrowser(shortTokens);
		page.signIn();
		const app = await openApp();
		await pass(5 * MINUTE_MS);
		page.gauzy.goOffline();
		// The renewals planned from half the lifetime on fail one after the other, and the token expires meanwhile
		await pass(30 * MINUTE_MS);
		expect(isSessionGood()).toBe(false);

		page.gauzy.goOnline();
		window.dispatchEvent(new Event('online'));
		await pass(MINUTE_MS);

		expect(isSessionGood()).toBe(true);
		expect(page.isSignedOut()).toBe(false);
		app.unmount();
	});

	it('runs when the tab is shown again after the computer slept past the expiry', async () => {
		openBrowser(shortTokens);
		page.signIn();
		const app = await openApp();
		skip(2 * HOUR_MS);

		document.dispatchEvent(new Event('visibilitychange'));
		await pass(MINUTE_MS);

		expect(isSessionGood()).toBe(true);
		expect(page.isSignedOut()).toBe(false);
		app.unmount();
	});

	it('runs within a minute of a wake-up no event announced', async () => {
		openBrowser(shortTokens);
		page.signIn();
		const app = await openApp();
		skip(2 * HOUR_MS);

		await pass(MINUTE_MS);

		expect(isSessionGood()).toBe(true);
		app.unmount();
	});

	it('keeps trying, less and less often, while the API cannot be reached, and ends nothing', async () => {
		openBrowser(shortTokens);
		page.signIn();
		const app = await openApp();
		page.gauzy.breakRenewals('network');

		// Due from the tenth minute on: fifty minutes of failures
		await pass(HOUR_MS);

		// A look per minute would make fifty attempts of four requests each
		expect(page.renewals()).toBeGreaterThan(4);
		expect(page.renewals()).toBeLessThan(80);
		expect(page.isSignedOut()).toBe(false);

		// The API is back: the session is renewed at a later look, without any event
		page.gauzy.breakRenewals(null);
		await pass(6 * MINUTE_MS);
		expect(isSessionGood()).toBe(true);
		app.unmount();
	});
});
