/** @jest-environment jsdom */
/**
 * Proxy mode: the browser talks to the web app's own `/api` routes, which answer 401 when Gauzy refuses the session.
 * An expired access token is renewed there as in direct mode (api.service.expired-token.test.ts): through the app's
 * `/api/auth/refresh` route, and the refused request is sent again.
 */
// Proxy mode: no Gauzy URL is published to the browser, whatever the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: '' }
}));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));

import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { HOUR_MS } from '@/test/auth/fake-gauzy-session';
import { timerService } from './api/timers';
import { getAPI } from './axios';

let page: FakeGauzyPage;

beforeEach(async () => {
	// Every request of proxy mode leaves through the one client of the app's own routes
	page = openFakeGauzyPage([await getAPI()]);
});

afterEach(() => page.close());

describe('proxy mode: a timer stop made with an expired access token, while the refresh token is still good', () => {
	it('stops the timer: the session is renewed through the app route and the stop is sent again', async () => {
		const { gauzy } = page;
		page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);

		const answer = await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(answer.data.running).toBe(false);
		expect(gauzy.timeLog()?.isRunning).toBe(false);
		expect(gauzy.count('POST', '/auth/refresh')).toBe(1);
		expect(gauzy.count('POST', '/timer/stop')).toBe(2);
		expect(page.isSignedOut()).toBe(false);
		expect(gauzy.acceptsAccessToken(getAccessTokenCookie())).toBe(true);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
	});

	it('never sends the stop again as the session another sign-in wrote to the cookies meanwhile', async () => {
		const { gauzy } = page;
		page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);
		gauzy.holdAnswers();
		// A's stop leaves with A's expired token; B (another organization) signs in while it is on its way
		const stopOfA = timerService.stopTimer({ source: ETimeLogSource.TEAMS }).then(
			() => null,
			(error: { statusCode?: number }) => error
		);
		for (let attempt = 0; attempt < 200 && gauzy.heldCount() < 1; attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 5));
		}
		expect(gauzy.heldCount()).toBe(1);
		const pairOfB = gauzy.signIn({ organizationId: '55555555-5555-4555-8555-555555555555' });
		page.keepInCookies(pairOfB);
		gauzy.answerAll();

		const error = await stopOfA;

		expect(error?.statusCode).toBe(401);
		expect(gauzy.count('POST', '/timer/stop')).toBe(1);
		expect(gauzy.sentTo('POST', '/timer/stop').map((request) => request.accessToken)).not.toContain(
			pairOfB.token
		);
		expect(gauzy.timeLog()?.isRunning).toBe(true);
		expect(gauzy.count('POST', '/auth/refresh')).toBe(0);
		expect(page.sentToSignIn).not.toHaveBeenCalled();
		expect(getAccessTokenCookie()).toBe(pairOfB.token);
	});
});
