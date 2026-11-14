/** @jest-environment jsdom */
/**
 * A timer runs in a tab that stays open, and the access token expires meanwhile (a day by default). The refresh token
 * is still good. The member presses Stop.
 *
 * The stop was answered 401 and failed with "The timer could not stop: Your session has ended. Sign in again to
 * continue.", the timer went on, and the tab was sent to the sign-in page: the refresh token was never tried. The
 * stop now goes through. The session is renewed behind it and the stop is sent again, without a word to the member.
 *
 * When the refresh token is refused too (the computer was off for longer than it lives, or the session was ended
 * from elsewhere), the session cannot be renewed: the stop is refused and the tab leaves for the sign-in page. The
 * stop is not lost with the page: it is kept in the browser, with the run it is for and the time it was pressed,
 * until the API answers it.
 *
 * The session and timer hooks, the API services and their interceptors are the app's own here: only the transport
 * is a stand-in for Gauzy.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

// Direct mode and the shipped ten minutes of the closed-tab rule, whatever the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: 'https://api.example.test' },
	STALE_TIMER_THRESHOLD: { value: 10 * 60_000 }
}));

const mockToastError = jest.fn();
const mockToastInfo = jest.fn();

jest.mock('next/navigation', () => ({ usePathname: () => '/', useParams: () => ({}) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		warning: jest.fn(),
		info: (...args: unknown[]) => mockToastInfo(...args)
	}
}));
// What the app logs is sent to its own log route
jest.mock('@/core/services/logs/logger-client', () => ({ sendLogToAPI: jest.fn(async () => undefined) }));
// What the timer and the session hooks read beside the session and the timer themselves
jest.mock('@/core/hooks/inbox/use-inbox-web-push', () => ({ forgetThisBrowserPush: jest.fn(async () => undefined) }));
jest.mock('@/core/components/features/chat-panel/chat-history', () => ({ clearChatHistoryForUser: jest.fn() }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: false }),
	useIsListedTeamManager: () => false
}));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useActiveTeamMemberUserId: () => undefined
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({
	useMyDailyPlans: () => ({ myDailyPlans: { items: [] }, isSuccess: true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => ({ updateOrganizationTeamEmployeeActiveTask: jest.fn(async () => undefined) })
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({
	useTeamTasksState: () => ({ setActiveTask: jest.fn(), isUpdatingActiveTask: false })
}));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({
	useUpdateTask: () => ({ updateTask: jest.fn() })
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => ({ taskStatuses: [] }) }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => jest.fn(async () => false) }));

import { resetUnauthorizedHandler } from '@/core/lib/auth/handle-unauthorized';
import { clearSessionEndedNotice, storedSessionEndedNotice } from '@/core/lib/auth/session-ended-notice';
import { resetSessionRenewal } from '@/core/lib/auth/session-renewal';
import { getAccessTokenCookie, getRefreshTokenCookie } from '@/core/lib/helpers/cookies';
import { forgetSavedStop, parseSavedStop, saveStop, storedSavedStop } from '@/core/lib/utils/timer/saved-stop';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { timerService } from '@/core/services/client/api/timers';
import { userService } from '@/core/services/client/api/users/user.service';
import { activeTeamIdState, organizationTeamsState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { openFakeGauzyPage, type FakeGauzyPage } from '@/test/auth/fake-gauzy-page';
import { FAKE_USER, HOUR_MS } from '@/test/auth/fake-gauzy-session';
import { useStaleTimerGuard } from './use-stale-timer-guard';
import { useTimerApi } from './use-timer-api';

let page: FakeGauzyPage;

/** A tab the member signed in to, whose timer runs: the page read the profile and shows the run. */
async function openTabWithRunningTimer() {
	const { gauzy } = page;
	page.signIn();
	const runningLog = gauzy.runTimer();

	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1', name: 'Team', members: [], projects: [] }] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(timerStatusState, { duration: 0, running: true, lastLog: runningLog } as never);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { result, unmount } = renderHook(() => useTimerApi({ updateLocalTimerStatus: jest.fn(), firstLoad: false }), {
		wrapper
	});
	// The profile read every signed-in page starts with
	await waitFor(() => expect(gauzy.count('GET', '/user/me')).toBe(1));
	await act(async () => undefined);

	const pressStop = async () => {
		await act(async () => {
			await Promise.resolve(result.current.stopTimer()).catch(() => undefined);
		});
	};
	/** The heartbeat the tab sends every minute while its timer runs. */
	const sendHeartbeat = async () => {
		await act(async () => {
			await result.current.syncTimer();
		});
	};
	return { pressStop, sendHeartbeat, store, unmount };
}

/**
 * The person signs in again, in a page loaded anew as the sign-in page was, and the app opens: its timer owner
 * runs the check every page load starts with, which the heartbeat waits for.
 */
async function signInAgainAndOpenTheApp() {
	resetUnauthorizedHandler();
	resetSessionRenewal();
	page.signIn();
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const employee = { id: FAKE_USER.employeeId, isTrackingTime: !!page.gauzy.timeLog()?.isRunning };
	const { result, unmount } = renderHook(() => useStaleTimerGuard(employee, true), { wrapper });
	await waitFor(() => expect(result.current).toBe(true));
	unmount();
}

beforeEach(() => {
	mockToastError.mockReset();
	mockToastInfo.mockReset();
	page = openFakeGauzyPage([timerService, authService, userService]);
});

afterEach(() => {
	forgetSavedStop();
	clearSessionEndedNotice();
	page.close();
});

describe('Stop pressed after the access token expired, while the refresh token is still good', () => {
	it('stops the timer without an error and keeps the member signed in', async () => {
		const { gauzy } = page;
		const tab = await openTabWithRunningTimer();
		// The tab stayed open past the access token's lifetime
		page.wait(25 * HOUR_MS);

		await tab.pressStop();
		// The heartbeat the stop sends first settles too: refused, then sent again
		await waitFor(() => expect(gauzy.count('POST', '/timesheet/time-slot')).toBe(2), { timeout: 4000 });

		expect(mockToastError).not.toHaveBeenCalled();
		expect(gauzy.timeLog()?.isRunning).toBe(false);
		expect(tab.store.get(timerStatusState)?.running).toBe(false);
		expect(page.renewals()).toBe(1);
		expect(page.isSignedOut()).toBe(false);
		expect(gauzy.acceptsAccessToken(getAccessTokenCookie())).toBe(true);
		expect(gauzy.acceptsRefreshToken(getRefreshTokenCookie())).toBe(true);
		// Answered: nothing of it is kept
		expect(storedSavedStop()).toBeNull();
		tab.unmount();
	});
});

describe('Stop pressed when the session can no longer be renewed', () => {
	it('is kept in the browser, with its run and the time it was pressed, as the tab leaves for the sign-in page', async () => {
		const { gauzy } = page;
		const tab = await openTabWithRunningTimer();
		const run = gauzy.timeLog();
		// The computer was off for longer than the refresh token lives
		page.wait(8 * 24 * HOUR_MS);
		const pressedAt = new Date(Date.now()).toISOString();

		await tab.pressStop();

		expect(mockToastError).toHaveBeenCalledWith('toasts.timer.STOP_FAILED', {
			id: 'timer-stop-failed',
			description: 'toasts.REASONS.SESSION'
		});
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
		// Nothing stopped the run: it goes on in the API
		expect(gauzy.timeLog()?.isRunning).toBe(true);
		expect(parseSavedStop(storedSavedStop())).toEqual({
			employeeId: FAKE_USER.employeeId,
			timeLogId: run?.id,
			source: 'TEAMS',
			pressedAt
		});
		tab.unmount();
	});

	it('is applied when the person signs in again: the run ends at the time Stop was pressed, no tracked time lost', async () => {
		const { gauzy } = page;
		// Later than the stops above: the timer takes two stops within half a second for one
		page.wait(10 * 24 * HOUR_MS);
		const tab = await openTabWithRunningTimer();
		await tab.sendHeartbeat();
		const lastHeartbeat = gauzy.timeLog()?.stoppedAt;
		// Forty seconds of work later, the session is ended from elsewhere, and the person presses Stop
		page.wait(40_000);
		gauzy.endSession();
		const pressedAt = new Date(Date.now()).toISOString();

		await tab.pressStop();
		tab.unmount();

		// The person is told why they are on the sign-in page, and the run goes on in the API meanwhile
		expect(page.sentToSignIn).toHaveBeenCalledTimes(1);
		expect(storedSessionEndedNotice()).not.toBeNull();
		expect(gauzy.timeLog()).toEqual(expect.objectContaining({ isRunning: true, stoppedAt: lastHeartbeat }));

		// They sign in again the next morning
		page.wait(15 * HOUR_MS);
		await signInAgainAndOpenTheApp();

		// The closed-tab rule alone ended the run at its last heartbeat: the forty seconds were lost
		expect(gauzy.timeLog()).toEqual(expect.objectContaining({ isRunning: false, stoppedAt: pressedAt }));
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-saved-stop-applied',
			description: 'toasts.timer.SAVED_STOP_HINT'
		});
		expect(storedSavedStop()).toBeNull();
	});

	it('is not kept when it fails while the session goes on: the timer goes on, and the person asks again', async () => {
		const { gauzy } = page;
		page.wait(20 * 24 * HOUR_MS);
		const tab = await openTabWithRunningTimer();
		gauzy.goOffline();

		await tab.pressStop();

		// The stop failed for a reason of its own, which the person is told
		expect(mockToastError).toHaveBeenCalledTimes(1);
		expect(mockToastError).not.toHaveBeenCalledWith(
			'toasts.timer.STOP_FAILED',
			expect.objectContaining({ description: 'toasts.REASONS.SESSION' })
		);
		expect(page.isSignedOut()).toBe(false);
		expect(storedSavedStop()).toBeNull();
		tab.unmount();
	});
});

describe('a stop whose run the tab does not know', () => {
	it('never forgets the stop kept for another run, whether it is answered or fails', async () => {
		const { gauzy } = page;
		// Later than the stops above: the timer takes two stops within half a second for one
		page.wait(30 * 24 * HOUR_MS);
		// A's stop, kept in this browser when A's session ended before the API answered it
		saveStop({
			employeeId: 'employee-of-a',
			timeLogId: 'run-of-a',
			source: ETimeLogSource.TEAMS,
			pressedAt: new Date(Date.now()).toISOString()
		});
		const keptStopOfA = storedSavedStop();
		// B's tab knows its timer runs, but not which run: the status it holds names no log
		const tab = await openTabWithRunningTimer();
		await act(async () => {
			tab.store.set(timerStatusState, { duration: 0, running: true, lastLog: undefined } as never);
		});

		// B's stop fails while B's session goes on
		gauzy.goOffline();
		await tab.pressStop();
		expect(gauzy.timeLog()?.isRunning).toBe(true);
		expect(storedSavedStop()).toBe(keptStopOfA);

		// B asks again, and the stop is answered
		gauzy.goOnline();
		page.wait(60_000);
		await act(async () => {
			tab.store.set(timerStatusState, { duration: 0, running: true, lastLog: undefined } as never);
		});
		await tab.pressStop();
		expect(gauzy.timeLog()?.isRunning).toBe(false);
		expect(storedSavedStop()).toBe(keptStopOfA);
		tab.unmount();
	});
});
