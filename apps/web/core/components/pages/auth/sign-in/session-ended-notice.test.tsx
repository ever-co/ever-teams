/** @jest-environment jsdom */
/**
 * The app ends a session that cannot go on (the API refuses its refresh token, or the session's cookies are gone) and
 * sends the tab to the sign-in page. That page said nothing about it: the person found a sign-in form where their
 * work was, with no reason given, and no word about the timer that was running.
 *
 * The sign-out is the app's own here (handle-unauthorized.ts); only the page's address is a stand-in.
 */
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

// The delay of the closed-tab rule, read when the notice renders
let mockStaleTimerThresholdMs = 10 * 60_000;

jest.mock('next-intl', () => ({
	// A text with values shows them after its key, so a test reads which values the page gave it
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	STALE_TIMER_THRESHOLD: {
		get value() {
			return mockStaleTimerThresholdMs;
		}
	}
}));
// What the sign-out logs and unsubscribes goes to the app's own routes
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
jest.mock('@/core/lib/utils/web-push', () => ({ unsubscribeThisBrowserPush: jest.fn(async () => undefined) }));

import { useTimerSessionEndWitness } from '@/core/hooks/timer/use-timer-session-end-witness';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { clearSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';
import { timerStatusState } from '@/core/stores';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { SessionEndedNotice } from './session-ended-notice';

const STARTED_AT = '2026-11-14T08:00:00.000Z';
const LAST_HEARTBEAT = '2026-11-14T08:59:00.000Z';
const MINUTE = 60_000;

let page: FakeGauzyPage;

const timeOfDay = (time: number) => new Date(time).toLocaleTimeString('en', { timeStyle: 'short' });
const dateAndTime = (time: number) => new Date(time).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
/** A time of the day the page opened, in the zone the suite runs in: the notice gives its time of day alone. */
const isOfTheDayThePageOpened = (time: number) => new Date(time).toDateString() === new Date(Date.now()).toDateString();
/** A time as the notice shows it: the time of day, with its date for a time of another day. */
const shownTime = (time: number) => (isOfTheDayThePageOpened(time) ? timeOfDay(time) : dateAndTime(time));

/** The signed-in app in the tab, whose timer shows `lastLog` as the person's last time log. */
function openAppWithTimer(lastLog: {
	source: ETimeLogSource;
	isRunning: boolean;
	stoppedAt: string;
	startedAt?: string;
}) {
	const store = createStore();
	store.set(timerStatusState, {
		duration: 0,
		running: lastLog.isRunning,
		lastLog: { id: 'log-1', startedAt: STARTED_AT, ...lastLog }
	} as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => useTimerSessionEndWitness(), { wrapper });
}

/** The app ends the session, and the tab shows the sign-in page it was sent to. */
async function openSignInPageAfterSessionEnded() {
	await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);
	expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
	render(<SessionEndedNotice />);
	return screen.getByRole('alert').textContent ?? '';
}

beforeEach(() => {
	mockStaleTimerThresholdMs = 10 * MINUTE;
	page = openFakeGauzyPage([]);
});

afterEach(() => {
	cleanup();
	clearSessionEndedNotice();
	page.close();
});

describe('the sign-in page, after the app ended the session', () => {
	it('says the session ended and asks to sign in again', async () => {
		const notice = await openSignInPageAfterSessionEnded();

		expect(notice).toContain('auth.sessionEnded.TITLE');
		expect(notice).toContain('auth.sessionEnded.TEXT');
		expect(notice).not.toContain('auth.sessionEnded.TIMER');
	});

	it('says nothing to a person the app did not sign out', () => {
		const { container } = render(<SessionEndedNotice />);

		expect(container.firstChild).toBeNull();
	});

	it('says nothing when the session ended on a page that keeps the person where they are', async () => {
		// A password reset link opened with an old session in the browser: the page stays, no sign-in page follows
		page.openAt('/auth/reset-password');

		await handleUnauthorized(DisconnectionReason.REFRESH_TOKEN_EXPIRED);
		expect(page.sentToSignIn).not.toHaveBeenCalled();

		const { container } = render(<SessionEndedNotice />);
		expect(container.firstChild).toBeNull();
	});
});

describe('the sign-in page, when a timer was running as the app ended the session', () => {
	it('says until when the person can sign in to keep it running, and where it is stopped after that', async () => {
		openAppWithTimer({ source: ETimeLogSource.TEAMS, isRunning: true, stoppedAt: LAST_HEARTBEAT });

		const notice = await openSignInPageAfterSessionEnded();

		// The closed-tab rule: a run without a heartbeat for ten minutes is stopped at its last heartbeat
		const lastHeartbeat = Date.parse(LAST_HEARTBEAT);
		const values = { deadline: shownTime(lastHeartbeat + 10 * MINUTE), savedUntil: shownTime(lastHeartbeat) };
		expect(notice).toContain(`auth.sessionEnded.TIMER_RUNNING ${JSON.stringify(values)}`);
	});

	it('gives a time of another day with its date', async () => {
		// The computer slept over the weekend with the timer running
		const fridayHeartbeat = Date.parse('2026-11-11T16:30:00.000Z');
		openAppWithTimer({
			source: ETimeLogSource.TEAMS,
			isRunning: true,
			startedAt: '2026-11-11T13:00:00.000Z',
			stoppedAt: new Date(fridayHeartbeat).toISOString()
		});

		const notice = await openSignInPageAfterSessionEnded();

		const values = {
			deadline: dateAndTime(fridayHeartbeat + 10 * MINUTE),
			savedUntil: dateAndTime(fridayHeartbeat)
		};
		expect(notice).toContain(`auth.sessionEnded.TIMER_RUNNING ${JSON.stringify(values)}`);
	});

	it('says the timer is still running where the app never stops a run left alone', async () => {
		mockStaleTimerThresholdMs = 0;
		openAppWithTimer({ source: ETimeLogSource.TEAMS, isRunning: true, stoppedAt: LAST_HEARTBEAT });

		const notice = await openSignInPageAfterSessionEnded();

		expect(notice).toContain('auth.sessionEnded.TIMER_STILL_RUNNING');
	});

	it('says the timer is still running when its run has had no heartbeat yet: the app never stops such a run', async () => {
		openAppWithTimer({ source: ETimeLogSource.TEAMS, isRunning: true, stoppedAt: STARTED_AT });

		const notice = await openSignInPageAfterSessionEnded();

		expect(notice).toContain('auth.sessionEnded.TIMER_STILL_RUNNING');
	});

	it.each([
		['the timer was stopped', { source: ETimeLogSource.TEAMS, isRunning: false, stoppedAt: LAST_HEARTBEAT }],
		[
			'the run is of another app, which the closed-tab rule leaves alone',
			{ source: ETimeLogSource.DESKTOP, isRunning: true, stoppedAt: LAST_HEARTBEAT }
		]
	])('says nothing of a timer when %s', async (_case, lastLog) => {
		openAppWithTimer(lastLog);

		const notice = await openSignInPageAfterSessionEnded();

		expect(notice).toContain('auth.sessionEnded.TITLE');
		expect(notice).not.toContain('auth.sessionEnded.TIMER');
	});

	it('says nothing of the timer of an app that is no longer in the tab', async () => {
		const app = openAppWithTimer({ source: ETimeLogSource.TEAMS, isRunning: true, stoppedAt: LAST_HEARTBEAT });
		app.unmount();

		const notice = await openSignInPageAfterSessionEnded();

		expect(notice).not.toContain('auth.sessionEnded.TIMER');
	});
});
