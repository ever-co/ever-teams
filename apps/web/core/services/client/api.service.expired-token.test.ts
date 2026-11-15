/** @jest-environment jsdom */
/**
 * An access token expires while the app is open (a day by default). The refresh token is still good, so no request
 * may fail for it: the token is renewed once, and each refused request is sent again with the new one.
 *
 * It used to fail instead. A timer stop pressed right after the expiry was answered 401, the member read "The timer
 * could not stop: Your session has ended. Sign in again to continue.", and was sent to the sign-in page, although
 * the refresh token had never been tried.
 */
// Direct mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' }
}));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));

import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { FAKE_USER, HOUR_MS, type FakeGauzy } from '@/test/auth/fake-gauzy-session';
import { ApiErrorService } from './api-error.service';
import { authService } from './api/auth/auth.service';
import { timerService } from './api/timers';
import { userService } from './api/users/user.service';

let page: FakeGauzyPage;
let gauzy: FakeGauzy;

async function waitFor(condition: () => boolean) {
	for (let attempt = 0; attempt < 200 && !condition(); attempt += 1) {
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	expect(condition()).toBe(true);
}

/** The error a request was rejected with. */
async function failureOf(request: Promise<unknown>): Promise<ApiErrorService> {
	try {
		await request;
	} catch (error) {
		return error as ApiErrorService;
	}
	throw new Error('The request was expected to fail');
}

beforeEach(() => {
	page = openFakeGauzyPage([timerService, authService, userService]);
	gauzy = page.gauzy;
});

afterEach(() => page.close());

describe('a request made with an expired access token, while the refresh token is still good', () => {
	it('stops the running timer: the token is renewed once and the stop is sent again', async () => {
		page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);

		const answer = await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(answer.data.running).toBe(false);
		expect(gauzy.timeLog()?.isRunning).toBe(false);
		expect(page.renewals()).toBe(1);
		expect(gauzy.count('POST', '/timesheet/timer/stop')).toBe(2);
		expect(page.isSignedOut()).toBe(false);
		// The session goes on with the pair the refresh answered
		expect(gauzy.acceptsAccessToken(getAccessTokenCookie())).toBe(true);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
	});

	it('renews the token once for requests refused together, and answers each of them', async () => {
		page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);
		gauzy.holdAnswers();

		// What a running timer has in flight when the person presses Stop: the status poll, the heartbeat, a profile
		// read, and the stop itself
		const requests = Promise.all([
			timerService.getTimerStatus(),
			timerService.syncTimer({ source: ETimeLogSource.TEAMS }),
			userService.getAuthenticatedUserData(),
			timerService.stopTimer({ source: ETimeLogSource.TEAMS })
		]);
		await waitFor(() => gauzy.heldCount() === 4);
		gauzy.answerAll();
		const [status, , user, stopped] = await requests;

		expect(page.renewals()).toBe(1);
		expect(status.data).toEqual(expect.objectContaining({ lastLog: expect.anything() }));
		expect(user.id).toBe(FAKE_USER.id);
		expect(stopped.data.running).toBe(false);
		expect(page.isSignedOut()).toBe(false);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
	});

	it('sends a request that was refused late with the token renewed meanwhile, without renewing again', async () => {
		const pair = page.signIn();
		page.wait(25 * HOUR_MS);
		gauzy.holdAnswers();

		// A read leaves with the expired token and is still on its way when another request renews the session
		const lateRead = timerService.getTimerStatus();
		await waitFor(() => gauzy.heldCount() === 1);
		const pairOfRenewal = gauzy.renewFromAnotherTab(pair.refresh_token);
		page.keepInCookies(pairOfRenewal);
		gauzy.answerAll();

		await expect(lateRead).resolves.toEqual(expect.objectContaining({ status: 200 }));
		expect(page.renewals()).toBe(0);
		expect(getRefreshTokenCookie()).toBe(pairOfRenewal.refresh_token);
	});
});

describe('a renewal that cannot be made', () => {
	it.each([
		['the network fails', 'network' as const],
		['the API answers 503', 'server' as const]
	])('fails the request with that error and keeps the session when %s', async (_case, failure) => {
		const pair = page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);
		gauzy.breakRenewals(failure);

		const error = await failureOf(timerService.stopTimer({ source: ETimeLogSource.TEAMS }));

		// Not the 401 of the stop: the person is told about a failure to try again, not about an ended session
		expect(error.statusCode).toBe(503);
		expect(page.isSignedOut()).toBe(false);
		expect(getRefreshTokenCookie()).toBe(pair.refresh_token);
		expect(gauzy.timeLog()?.isRunning).toBe(true);

		// Once the renewal can be made again, the next stop goes through
		gauzy.breakRenewals(null);
		const answer = await timerService.stopTimer({ source: ETimeLogSource.TEAMS });
		expect(answer.data.running).toBe(false);
	});
});

describe('a session the API no longer renews', () => {
	it('signs the person out when the refresh token is refused, and fails the request with its 401', async () => {
		page.signIn();
		gauzy.runTimer();
		gauzy.endSession();

		const error = await failureOf(timerService.stopTimer({ source: ETimeLogSource.TEAMS }));

		expect(error.statusCode).toBe(401);
		expect(page.renewals()).toBe(1);
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
		expect(getRefreshTokenCookie()).toBeFalsy();
		expect(getAccessTokenCookie()).toBeFalsy();
	});

	it('signs the person out without asking the API when no refresh token is left', async () => {
		// Another tab signed out: the cookies are gone, and this tab still shows the app
		const error = await failureOf(timerService.getTimerStatus());

		expect(error.statusCode).toBe(401);
		expect(page.renewals()).toBe(0);
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
	});
});

describe('a route that answers 401 for a reason of its own', () => {
	it('is asked again once with a renewed token, then its 401 is the answer: nobody is signed out', async () => {
		page.signIn();
		gauzy.refuseRoute('GET', '/timesheet/timer/status/worked');

		const error = await failureOf(timerService.getLastTimerLog(FAKE_USER.employeeId));

		expect(error.statusCode).toBe(401);
		expect(page.renewals()).toBe(1);
		expect(gauzy.count('GET', '/timesheet/timer/status/worked')).toBe(2);
		expect(page.isSignedOut()).toBe(false);
	});

	it('does not make each of its calls rotate the tokens: a token renewed moments ago is not renewed again', async () => {
		page.signIn();
		gauzy.refuseRoute('GET', '/timesheet/timer/status/worked');
		await failureOf(timerService.getLastTimerLog(FAKE_USER.employeeId));

		const error = await failureOf(timerService.getLastTimerLog(FAKE_USER.employeeId));

		expect(error.statusCode).toBe(401);
		expect(page.renewals()).toBe(1);
		expect(page.isSignedOut()).toBe(false);

		// Later, a 401 is taken for an expired token again
		page.wait(60_000);
		await failureOf(timerService.getLastTimerLog(FAKE_USER.employeeId));
		expect(page.renewals()).toBe(2);
	});
});

describe('a request refused while another sign-in took the place of its session', () => {
	it('fails with its own 401 and is never sent again as that other session', async () => {
		// A's stop leaves with A's expired token and is still on its way when another sign-in (B, another
		// organization) writes its pair to the cookies every tab shares
		page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);
		gauzy.holdAnswers();
		const stopOfA = failureOf(timerService.stopTimer({ source: ETimeLogSource.TEAMS }));
		await waitFor(() => gauzy.heldCount() === 1);
		const pairOfB = gauzy.signIn({ organizationId: '55555555-5555-4555-8555-555555555555' });
		page.keepInCookies(pairOfB);
		gauzy.answerAll();

		const error = await stopOfA;

		// A's stop fails with its own 401, and B's session never sends it
		expect(error.statusCode).toBe(401);
		expect(gauzy.count('POST', '/timesheet/timer/stop')).toBe(1);
		expect(gauzy.sentTo('POST', '/timesheet/timer/stop').map((request) => request.accessToken)).not.toContain(
			pairOfB.token
		);
		expect(gauzy.timeLog()?.isRunning).toBe(true);
		expect(page.renewals()).toBe(0);
		expect(page.sentToSignIn).not.toHaveBeenCalled();
		expect(getAccessTokenCookie()).toBe(pairOfB.token);
	});
});

describe('a request pinned to the token of the scope it was built for', () => {
	const scopeOf = (accessToken: string) => ({
		tenantId: FAKE_USER.tenantId,
		organizationId: FAKE_USER.organizationId,
		accessToken
	});

	it('is sent again with the renewed token of that same session', async () => {
		const pair = page.signIn();
		gauzy.runTimer();
		page.wait(25 * HOUR_MS);

		const status = await timerService.getTimerStatus({ scope: scopeOf(pair.token) });

		expect(status.data.running).toBe(true);
		expect(page.renewals()).toBe(1);
		const [refused, sentAgain] = gauzy.sentTo('GET', '/timesheet/timer/status');
		expect(refused.accessToken).toBe(pair.token);
		expect(sentAgain.accessToken).toBe(getAccessTokenCookie());
	});

	it('is never sent again with the token of another organization the session moved to', async () => {
		// The request was built in one organization, and the session now acts in another one
		const formerPair = gauzy.signIn({ organizationId: '55555555-5555-4555-8555-555555555555' });
		page.signIn();
		page.wait(25 * HOUR_MS);

		const error = await failureOf(timerService.getTimerStatus({ scope: scopeOf(formerPair.token) }));

		expect(error.statusCode).toBe(401);
		expect(gauzy.count('GET', '/timesheet/timer/status')).toBe(1);
		expect(page.isSignedOut()).toBe(false);
	});
});

describe('a 401 on a page that is open without a session', () => {
	it.each(['/auth/passcode', '/team/11111111-1111-4111-8111-111111111111', '/fr/team/some-team'])(
		'is the answer on %s: nothing is renewed and nobody is sent elsewhere',
		async (pathname) => {
			page.signIn();
			page.wait(25 * HOUR_MS);
			page.openAt(pathname);

			const error = await failureOf(timerService.getTimerStatus());

			expect(error.statusCode).toBe(401);
			expect(page.renewals()).toBe(0);
			expect(page.isSignedOut()).toBe(false);
		}
	);
});
