/**
 * The app keeps a refresh token from the sign-in and never used it. Once the access token had expired (a day by
 * default), every request was refused: the timer could no longer be stopped, and the next read of the profile signed
 * the person out, although their refresh token was still good.
 *
 * A refused request now renews the session with the refresh token and is sent again. The store that holds the session,
 * the requests and the HTTP client are the app's own here: only `fetch` is a stand-in for Gauzy.
 */
import { showMessage } from 'react-native-flash-message';
import { AuthenticationStore, AuthenticationStoreModel } from '../../models/authentication-store';
import { TimerSource } from '../interfaces/ITimer';
import { createFakeGauzy, FakeGauzy, HOUR_MS } from '../../../test/fake-gauzy-session';
import { renewSessionNow } from './fetch';
import { currentAuthenticatedUserRequest } from './requests/auth';
import { stopTimerRequest } from './requests/timer';

jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));

const originalFetch = global.fetch;
const START = Date.parse('2026-11-14T09:00:00.000Z');

let gauzy: FakeGauzy;
let store: AuthenticationStore;

const session = () => store;
/** The access token the screens hold. */
const tokenOfTheSession = () => String(session().authToken);
const stopParams = {
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	taskId: 'task-1',
	logType: 'TRACKED' as const,
	source: TimerSource.MOBILE,
	tags: []
};
/** The person presses Stop: the request leaves with the token the screen holds. */
const stopTimer = (token = tokenOfTheSession()) => stopTimerRequest(stopParams, token);
/** Time passes: the tokens age for the app and for the API alike. */
const wait = (milliseconds: number) => jest.setSystemTime(Date.now() + milliseconds);

/** The app's store of the session, then a sign-in: the store keeps the pair. */
function openAppAndSignIn() {
	store = AuthenticationStoreModel.create({ user: null });
	const pair = gauzy.signIn();
	session().setAuthToken(pair.token);
	session().setRefreshToken(pair.refresh_token);
	return pair;
}

beforeEach(() => {
	jest.setSystemTime(START);
	(showMessage as jest.Mock).mockClear();
	jest.spyOn(console, 'error').mockImplementation(() => undefined);
	gauzy = createFakeGauzy();
	global.fetch = gauzy.fetch as unknown as typeof fetch;
	openAppAndSignIn();
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.restoreAllMocks();
});

describe('a request the API refuses because the access token expired', () => {
	it('stops the timer: the session is renewed and the stop is sent again', async () => {
		gauzy.runTimer();
		const signedInWith = { token: session().authToken, refreshToken: session().refreshToken };
		// The app stayed open past the access token's lifetime
		wait(25 * HOUR_MS);

		const { data, response } = await stopTimer();

		expect(response.ok).toBe(true);
		expect(data.isRunning).toBe(false);
		expect(gauzy.timer()?.isRunning).toBe(false);
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		// The stop left twice: refused, then with the new token
		expect(gauzy.sentTo('POST', '/timesheet/timer/stop').map((request) => request.status)).toEqual([401, 200]);
		// Gauzy rotates the refresh token: the app keeps both tokens of the new pair
		expect(session().authToken).not.toBe(signedInWith.token);
		expect(session().refreshToken).not.toBe(signedInWith.refreshToken);
		expect(gauzy.acceptsAccessToken(session().authToken)).toBe(true);
		expect(gauzy.acceptsRefreshToken(session().refreshToken)).toBe(true);
		expect(session().isAuthenticated).toBe(true);
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('renews once for the requests refused together', async () => {
		gauzy.runTimer();
		wait(25 * HOUR_MS);
		const token = tokenOfTheSession();

		const [profile, stop, profileAgain] = await Promise.all([
			currentAuthenticatedUserRequest({ bearer_token: token }),
			stopTimer(token),
			currentAuthenticatedUserRequest({ bearer_token: token })
		]);

		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		expect([profile.response.status, stop.response.status, profileAgain.response.status]).toEqual([200, 200, 200]);
		expect(session().isAuthenticated).toBe(true);
	});

	it('sends a request that left with the token just replaced with the new one, without another renewal', async () => {
		// A screen keeps the token of its first render: after a renewal, its requests still name the old one
		const tokenOfTheScreen = tokenOfTheSession();
		wait(25 * HOUR_MS);
		await currentAuthenticatedUserRequest({ bearer_token: tokenOfTheScreen });
		gauzy.runTimer();

		const { response } = await stopTimer(tokenOfTheScreen);

		expect(response.ok).toBe(true);
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		// Not refused first: it left with the session's token
		expect(gauzy.sentTo('POST', '/timesheet/timer/stop').map((request) => request.status)).toEqual([200]);
	});
});

describe('a session the API no longer renews', () => {
	it('ends, and the person is told, when the API refuses the refresh token', async () => {
		gauzy.runTimer();
		gauzy.endSession();

		const { response } = await stopTimer();

		expect(response.status).toBe(401);
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(1);
		expect(session().isAuthenticated).toBe(false);
		expect(session().refreshToken).toBeFalsy();
		expect(showMessage).toHaveBeenCalledTimes(1);
		expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
	});

	it.each([
		['the network fails', 'network' as const],
		['the API answers 503', 'server' as const]
	])('is kept when the renewal cannot be made because %s', async (_case, failure) => {
		gauzy.runTimer();
		wait(25 * HOUR_MS);
		const signedInWith = { token: session().authToken, refreshToken: session().refreshToken };
		gauzy.breakRenewals(failure);

		const { response } = await stopTimer();

		// The stop is answered as refused, and nothing is known about the session: it stays
		expect(response.status).toBe(401);
		expect(session().authToken).toBe(signedInWith.token);
		expect(session().refreshToken).toBe(signedInWith.refreshToken);
		expect(showMessage).not.toHaveBeenCalled();

		// And the stop goes through once the renewal can be made again
		gauzy.breakRenewals(null);
		expect((await stopTimer()).response.ok).toBe(true);
		expect(gauzy.timer()?.isRunning).toBe(false);
	});
});

describe('a renewal on its way when the person signs out and signs in again', () => {
	/** The first renewal's request reaches the API only once `answer()` is called: the other sign-in comes first. */
	function holdFirstRenewal() {
		let renewalAsked!: () => void;
		let answer!: () => void;
		const asked = new Promise<void>((resolve) => (renewalAsked = resolve));
		const answerHeld = new Promise<void>((resolve) => (answer = resolve));
		let renewals = 0;
		global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			if (typeof input === 'string' && input.includes('/auth/refresh-token') && ++renewals === 1) {
				renewalAsked();
				await answerHeld;
			}
			return gauzy.fetch(input, init);
		}) as typeof fetch;
		return { asked, answer };
	}

	/** Another sign-in: another account, maybe, of the same tenant. */
	function signInAgain() {
		const otherSession = gauzy.signIn();
		session().setAuthToken(otherSession.token);
		session().setRefreshToken(otherSession.refresh_token);
		return otherSession;
	}

	it('does not send the refused request again with the token of the session signed in since', async () => {
		gauzy.runTimer();
		wait(25 * HOUR_MS);
		const firstRenewal = holdFirstRenewal();

		const stop = stopTimer();
		await firstRenewal.asked;
		const otherSession = signInAgain();
		firstRenewal.answer();
		const { response } = await stop;

		// The stop of the session that ended is answered as refused: it never leaves again, to stop another's timer
		expect(response.status).toBe(401);
		expect(gauzy.sentTo('POST', '/timesheet/timer/stop').map((request) => request.status)).toEqual([401]);
		expect(gauzy.timer()?.isRunning).toBe(true);
		// The session signed in since is the one the app holds, untouched
		expect(session().authToken).toBe(otherSession.token);
		expect(session().refreshToken).toBe(otherSession.refresh_token);
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('renews the session signed in since with its own refresh token, not with the renewal of the one that ended', async () => {
		gauzy.runTimer();
		wait(25 * HOUR_MS);
		const firstRenewal = holdFirstRenewal();

		const stop = stopTimer();
		await firstRenewal.asked;
		const otherSession = signInAgain();
		// A screen of the new session needs a fresh token while the ended session's renewal is still on its way
		const renewal = renewSessionNow();
		firstRenewal.answer();

		expect(await renewal).toBe('renewed');
		expect((await stop).response.status).toBe(401);
		// Each session sent its own refresh token once, and the app keeps the pair answered to the new one
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(2);
		expect(session().refreshToken).not.toBe(otherSession.refresh_token);
		expect(gauzy.acceptsRefreshToken(session().refreshToken)).toBe(true);
		expect(gauzy.acceptsAccessToken(session().authToken)).toBe(true);
		expect(showMessage).not.toHaveBeenCalled();
	});
});

describe('a request that does not carry the session', () => {
	it('is answered as it is when its token is not the session`s: a sign-in under way is not the session', async () => {
		const tokenOfASignInUnderWay = 'token-of-a-workspace-not-chosen-yet';

		const { response } = await currentAuthenticatedUserRequest({ bearer_token: tokenOfASignInUnderWay });

		expect(response.status).toBe(401);
		expect(gauzy.sentTo('POST', '/auth/refresh-token')).toHaveLength(0);
		expect(session().isAuthenticated).toBe(true);
		expect(showMessage).not.toHaveBeenCalled();
	});
});
