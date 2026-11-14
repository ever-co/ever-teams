/**
 * Test-only (never part of the app). The browser page of a session test: a tab of the app talking to the stand-in
 * Gauzy (fake-gauzy-session.ts), with the page's address, the session cookies, and a clock the test moves.
 */
import type { AxiosInstance } from 'axios';

import { resetUnauthorizedHandler } from '@/core/lib/auth/handle-unauthorized';
import { resetSessionRenewal } from '@/core/lib/auth/session-renewal';
import {
	getRefreshTokenCookie,
	removeAuthCookies,
	setAccessTokenCookie,
	setRefreshTokenCookie
} from '@/core/lib/helpers/cookies';
import { createFakeGauzy } from './fake-gauzy-session';

const START = Date.parse('2026-11-14T09:00:00.000Z');
const originalLocation = window.location;

type TokenPair = { token: string; refresh_token: string };

interface FakeGauzyPageOptions {
	/**
	 * `moved by wait()`: `Date.now()` answers the page's own clock, which only `wait()` moves, and timers are real.
	 * `jest timers`: the test installed Jest's fake timers, and moves time with them.
	 */
	clock?: 'moved by wait()' | 'jest timers';
}

/**
 * Opens the page on `/`, signed out, with the given API clients answered by a stand-in Gauzy.
 *
 * @param clients The services (or clients) whose requests the stand-in answers.
 */
export function openFakeGauzyPage(
	clients: Array<{ axiosInstance: AxiosInstance }>,
	{ clock = 'moved by wait()' }: FakeGauzyPageOptions = {}
) {
	let now = START;
	if (clock === 'moved by wait()') {
		jest.spyOn(Date, 'now').mockImplementation(() => now);
	}
	for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
		jest.spyOn(console, method).mockImplementation(() => undefined);
	}

	const sentToSignIn = jest.fn();
	const openAt = (pathname: string) => {
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, pathname, assign: sentToSignIn }
		});
	};
	openAt('/');

	const gauzy = createFakeGauzy();
	for (const client of clients) {
		client.axiosInstance.defaults.adapter = gauzy.adapter;
	}
	resetUnauthorizedHandler();
	resetSessionRenewal();

	/** What a tab does with a pair it received: both tokens go to the cookies every tab shares. */
	const keepInCookies = (pair: TokenPair) => {
		setAccessTokenCookie(pair.token);
		setRefreshTokenCookie(pair.refresh_token);
	};

	return {
		gauzy,
		/** The calls that sent the page to the sign-in page. */
		sentToSignIn,
		/** The page the person is on. */
		openAt,
		keepInCookies,
		/** The person signs in and the page keeps that session. */
		signIn: (): TokenPair => {
			const pair = gauzy.signIn();
			keepInCookies(pair);
			return pair;
		},
		/** Time passes: the tokens age for the app and for the API alike. */
		wait: (milliseconds: number) => {
			now += milliseconds;
		},
		/** Whether the app ended the session: it left for the sign-in page, or the refresh token is gone. */
		isSignedOut: () => sentToSignIn.mock.calls.length > 0 || !getRefreshTokenCookie(),
		/** How many times the session was renewed through Gauzy's own route. */
		renewals: () => gauzy.count('POST', '/auth/refresh-token'),
		close: () => {
			removeAuthCookies();
			jest.restoreAllMocks();
			Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
		}
	};
}

export type FakeGauzyPage = ReturnType<typeof openFakeGauzyPage>;
