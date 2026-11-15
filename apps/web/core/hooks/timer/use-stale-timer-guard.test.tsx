/** @jest-environment jsdom */
/**
 * The closed-tab rule (#4586): a TEAMS run its tab left running is stopped at its last heartbeat when the app loads.
 * #5118: the check runs once per page load. The timer's owner mounts again within a page (the (main) layout after a
 * page outside it; the offline page used to unmount it too), and a check made again then found the run this page had
 * kept alive stale, with no heartbeat while the owner was unmounted, and stopped it.
 *
 * #5248: a stop the person asked for as their session ended is kept in the browser (saved-stop.ts). The check applies
 * it first, at the time it was asked for: the closed-tab rule alone ended that run at its last heartbeat, and the
 * time worked between the two was lost.
 *
 * #5123: below the closed-tab delay, the time a run went on without a heartbeat was kept without a word, and a tab
 * that woke up after a sleep sent a heartbeat that put the whole sleep in the run. The person is asked, and the
 * check runs again when the page wakes up.
 */
import type { ReactNode } from 'react';
import type { RenderHookResult, waitFor as WaitFor } from '@testing-library/react';
import { SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { forgetSavedStop, parseSavedStop, saveStop, storedSavedStop } from '@/core/lib/utils/timer/saved-stop';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

// Each page below loads React Testing Library afresh, inside a test, where it cannot register its own cleanup
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLastTimerLog = jest.fn();
const mockStopTimer = jest.fn();
const mockSyncTimer = jest.fn();
const mockToastInfo = jest.fn();
const mockTranslate = (key: string) => key;

jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getLastTimerLog: (...args: unknown[]) => mockGetLastTimerLog(...args),
		stopTimer: (...args: unknown[]) => mockStopTimer(...args),
		syncTimer: (...args: unknown[]) => mockSyncTimer(...args)
	}
}));
jest.mock('sonner', () => ({ toast: { info: (...args: unknown[]) => mockToastInfo(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
// The shipped 10-minute threshold, whatever NEXT_PUBLIC_STALE_TIMER_THRESHOLD_MINUTES the env files loaded for Jest set
jest.mock('@/core/constants/config/constants', () => {
	const constants = jest.requireActual<typeof import('@/core/constants/config/constants')>(
		'@/core/constants/config/constants'
	);
	return { ...constants, STALE_TIMER_THRESHOLD: { value: constants.STALE_TIMER_THRESHOLD_MS } };
});

const EMPLOYEE = { id: 'employee-1', isTrackingTime: true };
const STARTED_AT = '2026-11-12T08:00:00.000Z';
const LAST_HEARTBEAT = '2026-11-12T09:00:00.000Z';
const MINUTE = 60_000;

/** Gauzy's answer for the employee's last log, a TEAMS run, read `minutes` after its last heartbeat on Gauzy's clock. */
function lastLogAnswer(minutes: number) {
	return {
		data: [
			{
				lastLog: {
					id: 'log-1',
					source: ETimeLogSource.TEAMS,
					isRunning: true,
					startedAt: STARTED_AT,
					stoppedAt: LAST_HEARTBEAT
				}
			}
		],
		headers: { date: new Date(Date.parse(LAST_HEARTBEAT) + minutes * MINUTE).toUTCString() }
	};
}

interface Page {
	/** The timer's owner mounting the guard, for the signed-in employee. */
	mountOwner: (employee?: typeof EMPLOYEE) => RenderHookResult<boolean, unknown>;
	/** Gauzy's refusal of a request with this status, as the page's API services reject it. */
	refusal: (status: number) => unknown;
	waitFor: typeof WaitFor;
	/** Lets the guard's pending work land, `ms` of fake time later. */
	settle: (ms?: number) => Promise<void>;
	/** A sign-out in this page: the cleanups its modules registered, as the sign-out runs them. */
	signOut: () => void;
	/** The question about time without the app that waits for an answer in this page, or null. */
	question: () => { employeeId: string; timeLogId: string; from: string; until: number } | null;
	/** The person's answer to it. */
	answer: (answer: 'keep' | 'stop') => Promise<void>;
	/** The computer sleeps: the clock moves on, no timer of the page runs, and the page then looks at the clock. */
	sleep: (ms: number) => Promise<void>;
	/** What the sender of a heartbeat asks first: whether that time is still to be settled. */
	isUnsettled: () => boolean;
	/** What a stop waits for: the moment that time is settled, with whether the run was stopped there, or null. */
	whenSettled: () => Promise<boolean> | null;
	cleanup: () => void;
}

let pages: Page[] = [];

/** A page load: the app's modules evaluated afresh, as a reload evaluates them. */
function loadPage(): Page {
	jest.resetModules();
	/* eslint-disable @typescript-eslint/no-require-imports */
	const { createElement } = require('react') as typeof import('react');
	const { act, cleanup, renderHook, waitFor } =
		require('@testing-library/react') as typeof import('@testing-library/react');
	const { QueryClient, QueryClientProvider } =
		require('@tanstack/react-query') as typeof import('@tanstack/react-query');
	const { useStaleTimerGuard, isUnfollowedTimeUnsettled, whenUnfollowedTimeIsSettled } =
		require('./use-stale-timer-guard') as typeof import('./use-stale-timer-guard');
	const { answerUnfollowedTime, unfollowedTimeQuestion } =
		require('@/core/lib/utils/timer/unfollowed-time') as typeof import('@/core/lib/utils/timer/unfollowed-time');
	const { lookAtPageClock } =
		require('@/core/lib/utils/timer/page-sleep') as typeof import('@/core/lib/utils/timer/page-sleep');
	const { runSignOutCleanups } =
		require('@/core/lib/auth/sign-out-cleanups') as typeof import('@/core/lib/auth/sign-out-cleanups');
	const { ApiErrorService } =
		require('@/core/services/client/api-error.service') as typeof import('@/core/services/client/api-error.service');
	/* eslint-enable @typescript-eslint/no-require-imports */
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const page = {
		mountOwner: (employee = EMPLOYEE) => renderHook(() => useStaleTimerGuard(employee, true), { wrapper }),
		refusal: (status: number) =>
			ApiErrorService.fromAxiosError({ isAxiosError: true, message: 'refused', response: { status, data: {} } }),
		waitFor,
		settle: (ms = 0) =>
			act(async () => {
				jest.advanceTimersByTime(ms);
				// The check's answer goes through a few promise steps before the guard's state is set
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
		signOut: runSignOutCleanups,
		question: unfollowedTimeQuestion,
		answer: (answer: 'keep' | 'stop') =>
			act(async () => {
				answerUnfollowedTime(answer);
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
		sleep: (ms: number) =>
			act(async () => {
				jest.setSystemTime(Date.now() + ms);
				lookAtPageClock();
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
		isUnsettled: isUnfollowedTimeUnsettled,
		whenSettled: whenUnfollowedTimeIsSettled,
		cleanup
	};
	pages.push(page);
	return page;
}

describe('useStaleTimerGuard', () => {
	beforeEach(() => {
		mockGetLastTimerLog.mockReset();
		mockStopTimer.mockReset().mockResolvedValue({ data: { running: false } });
		mockToastInfo.mockReset();
	});

	afterEach(() => {
		pages.forEach((page) => page.cleanup());
		pages = [];
		jest.useRealTimers();
	});

	it('does not check again when the owner mounts again in the same page: the run it kept alive goes on', async () => {
		const page = loadPage();
		// The page loads a minute after the run's last heartbeat, and keeps the run alive from then on
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(owner.result.current).toBe(true));

		// The owner unmounts and mounts again 30 minutes later, no heartbeat sent meanwhile
		owner.unmount();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(30));
		const mountedAgain = page.mountOwner();

		await page.waitFor(() => expect(mountedAgain.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
	});

	it('checks again on the next page load, and stops the run a closed tab left at its last heartbeat', async () => {
		const closedTab = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));
		const owner = closedTab.mountOwner();
		await closedTab.waitFor(() => expect(owner.result.current).toBe(true));
		owner.unmount();

		// The tab was closed with the run going, and the app opens again 30 minutes later
		const reopened = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(30));
		const reopenedOwner = reopened.mountOwner();

		// The heartbeat waits for the check
		expect(reopenedOwner.result.current).toBe(false);
		await reopened.waitFor(() => expect(reopenedOwner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: LAST_HEARTBEAT
		});
		expect(mockToastInfo).toHaveBeenCalledWith(
			'toasts.timer.STALE_STOPPED',
			expect.objectContaining({ id: 'timer-stale-stopped' })
		);
	});

	it('checks again for the next session after a sign-out that leaves the page loaded', async () => {
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(owner.result.current).toBe(true));
		owner.unmount();

		// Signed out where the page stays loaded (a password recovery page), then signed in again as the same employee
		page.signOut();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));
		const nextSession = page.mountOwner();

		// A new check, which the heartbeat waits for
		expect(nextSession.result.current).toBe(false);
		await page.waitFor(() => expect(nextSession.result.current).toBe(true));
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
	});

	it('waits for the check in flight when the owner mounts again meanwhile, instead of checking twice', async () => {
		const page = loadPage();
		let answer: (response: unknown) => void = () => undefined;
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(30)).mockReturnValueOnce(
			new Promise((resolve) => {
				answer = resolve;
			})
		);
		page.mountOwner().unmount();
		const mountedAgain = page.mountOwner();
		expect(mountedAgain.result.current).toBe(false);

		answer(lastLogAnswer(30));
		await page.waitFor(() => expect(mountedAgain.result.current).toBe(true));
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
	});

	it('retries a failed check after the sync interval while the owner stays mounted, the heartbeat held until then', async () => {
		jest.useFakeTimers();
		const page = loadPage();
		mockGetLastTimerLog.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(lastLogAnswer(1));
		const owner = page.mountOwner();
		await page.settle();
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);

		// Nothing is read again, and the heartbeat stays held, for the whole interval
		await page.settle(SYNC_TIMER_INTERVAL - 1);
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
		expect(owner.result.current).toBe(false);

		await page.settle(1);
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
		expect(owner.result.current).toBe(true);
	});

	it('runs a check that failed again when the owner mounts again, the heartbeat held meanwhile', async () => {
		const page = loadPage();
		mockGetLastTimerLog.mockRejectedValueOnce(new Error('Network Error'));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1));
		expect(owner.result.current).toBe(false);
		owner.unmount();

		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(30));
		const mountedAgain = page.mountOwner();

		await page.waitFor(() => expect(mountedAgain.result.current).toBe(true));
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
	});
});

describe('useStaleTimerGuard, with a stop the person asked for as their session ended', () => {
	const SECOND = 1000;
	/** When Stop was pressed, counted from the run's last heartbeat. */
	const pressedAt = (afterLastHeartbeatMs: number) =>
		new Date(Date.parse(LAST_HEARTBEAT) + afterLastHeartbeatMs).toISOString();
	/** The stop the browser kept: asked by the employee, for the run of `lastLogAnswer`. */
	const keepStop = (afterLastHeartbeatMs: number, stop: Partial<Parameters<typeof saveStop>[0]> = {}) =>
		saveStop({
			employeeId: EMPLOYEE.id,
			timeLogId: 'log-1',
			source: ETimeLogSource.TEAMS,
			pressedAt: pressedAt(afterLastHeartbeatMs),
			...stop
		});
	const keptStop = () => parseSavedStop(storedSavedStop());

	beforeEach(() => {
		mockGetLastTimerLog.mockReset();
		mockStopTimer.mockReset().mockResolvedValue({ data: { running: false } });
		mockToastInfo.mockReset();
	});

	afterEach(() => {
		pages.forEach((page) => page.cleanup());
		pages = [];
		forgetSavedStop();
		jest.useRealTimers();
	});

	it('applies it at the next sign-in, at the time it was pressed and for its run, and tells the person', async () => {
		// Stop was pressed 40 seconds after the last heartbeat, and the person signs in again three hours later
		keepStop(40 * SECOND);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(180));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		// Not at the last heartbeat, where the closed-tab rule alone ended the run
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: pressedAt(40 * SECOND),
			timeLogId: 'log-1'
		});
		expect(mockToastInfo).toHaveBeenCalledTimes(1);
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-saved-stop-applied',
			description: 'toasts.timer.SAVED_STOP_HINT'
		});
		expect(keptStop()).toBeNull();
	});

	it('never ends the run before its last heartbeat, which a computer clock running late would do', async () => {
		// On the computer's clock, Stop was pressed two minutes before the heartbeat Gauzy last recorded
		keepStop(-2 * MINUTE);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(180));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledWith(expect.objectContaining({ stoppedAt: LAST_HEARTBEAT }));
	});

	it("never ends the run after the present on Gauzy's clock, which a computer clock running fast would do", async () => {
		// On the computer's clock Stop was pressed five minutes after the last heartbeat; Gauzy's is one minute past it
		keepStop(5 * MINUTE);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledWith(expect.objectContaining({ stoppedAt: pressedAt(1 * MINUTE) }));
	});

	it('leaves the run to the closed-tab rule when the app was not following it as Stop was pressed', async () => {
		// The computer slept for an hour with the timer running; Stop was pressed as it woke up, the session ended
		keepStop(60 * MINUTE);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(180));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		// The hour asleep is not counted: the run ends at its last heartbeat, as for a closed tab
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: LAST_HEARTBEAT
		});
		expect(mockToastInfo).toHaveBeenCalledWith(
			'toasts.timer.STALE_STOPPED',
			expect.objectContaining({ id: 'timer-stale-stopped' })
		);
		expect(keptStop()).toBeNull();
	});

	it('never applies it for another employee, and keeps it for the one who asked', async () => {
		keepStop(40 * SECOND, { employeeId: 'employee-2' });
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(keptStop()?.employeeId).toBe('employee-2');
	});

	it('never ends another run than the one it was pressed for', async () => {
		// The run was stopped from another device meanwhile, and a new one started there
		keepStop(40 * SECOND, { timeLogId: 'log-0' });
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(1));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
		expect(keptStop()).toBeNull();
	});

	it('forgets it when the employee tracks no time anymore: the run was stopped meanwhile', async () => {
		keepStop(40 * SECOND);
		const page = loadPage();

		const owner = page.mountOwner({ ...EMPLOYEE, isTrackingTime: false });

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockGetLastTimerLog).not.toHaveBeenCalled();
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(keptStop()).toBeNull();
	});

	it.each([
		['406: the run was stopped as the stop arrived', 406],
		['409: another run is the running one by then', 409]
	])('forgets it when Gauzy refuses it with %s', async (_case, status) => {
		keepStop(40 * SECOND);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(1));
		mockStopTimer.mockRejectedValueOnce(page.refusal(status));

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockToastInfo).not.toHaveBeenCalled();
		expect(keptStop()).toBeNull();
	});

	it('keeps it when it cannot be sent, and applies it at the next try, the heartbeat held until then', async () => {
		jest.useFakeTimers();
		keepStop(40 * SECOND);
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(180));
		mockStopTimer.mockRejectedValueOnce(new Error('Network Error'));
		const owner = page.mountOwner();
		await page.settle();

		// The stop was not applied: a heartbeat sent now would move the run's end past the time Stop was pressed
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(owner.result.current).toBe(false);
		expect(keptStop()).not.toBeNull();

		await page.settle(SYNC_TIMER_INTERVAL);
		expect(mockStopTimer).toHaveBeenCalledTimes(2);
		expect(mockStopTimer).toHaveBeenLastCalledWith(
			expect.objectContaining({ stoppedAt: pressedAt(40 * SECOND), timeLogId: 'log-1' })
		);
		expect(owner.result.current).toBe(true);
		expect(keptStop()).toBeNull();
	});
});

describe('useStaleTimerGuard, with time the run went on without the app', () => {
	const HEARTBEAT_OF_KEPT_RUN = '2026-11-12T09:07:00.000Z';
	/** Gauzy's answer once a later heartbeat was taken for the same run, read `minutes` after the first one. */
	const answerAfterLaterHeartbeat = (minutes: number) => {
		const answered = lastLogAnswer(minutes);
		answered.data[0].lastLog.stoppedAt = HEARTBEAT_OF_KEPT_RUN;
		return answered;
	};
	/** A page that opens `minutes` after the run's last heartbeat, and its owner. */
	const openAppAfter = (minutes: number) => {
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(minutes));
		return { page, owner: page.mountOwner() };
	};
	const STOPPED_AT_LAST_HEARTBEAT = {
		source: ETimeLogSource.TEAMS,
		startedAt: STARTED_AT,
		stoppedAt: LAST_HEARTBEAT,
		timeLogId: 'log-1'
	};

	beforeEach(() => {
		mockGetLastTimerLog.mockReset();
		mockStopTimer.mockReset().mockResolvedValue({ data: { running: false } });
		mockSyncTimer.mockReset().mockResolvedValue({ data: { running: true, lastLog: null } });
		mockToastInfo.mockReset();
		window.localStorage.clear();
	});

	afterEach(() => {
		pages.forEach((page) => page.signOut());
		pages.forEach((page) => page.cleanup());
		pages = [];
		jest.useRealTimers();
	});

	it('asks, when the app opens within the closed-tab delay, instead of keeping that time without a word', async () => {
		const { page, owner } = openAppAfter(7);

		await page.waitFor(() => expect(page.question()).not.toBeNull());

		expect(page.question()).toEqual(
			expect.objectContaining({ employeeId: EMPLOYEE.id, timeLogId: 'log-1', from: LAST_HEARTBEAT })
		);
		// Nothing of that time is counted yet: the run is not stopped, and no heartbeat goes
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(owner.result.current).toBe(false);
		expect(page.isUnsettled()).toBe(true);
	});

	it('asks nothing after three minutes without a heartbeat, the ordinary pace of a tab in the background', async () => {
		const { page, owner } = openAppAfter(3);

		await page.waitFor(() => expect(owner.result.current).toBe(true));

		expect(page.question()).toBeNull();
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(page.isUnsettled()).toBe(false);
	});

	it('keeps the time when the person says so: a heartbeat goes at once, and the run goes on', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('keep');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockSyncTimer).toHaveBeenCalledTimes(1);
		expect(mockSyncTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			user: { employee: { id: EMPLOYEE.id } },
			timeLogId: 'log-1'
		});
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
		expect(page.question()).toBeNull();
	});

	it('keeps the time even when that heartbeat fails: the one the app sends each minute takes over', async () => {
		const { page, owner } = openAppAfter(7);
		mockSyncTimer.mockRejectedValue(new Error('Network Error'));
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('keep');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(page.question()).toBeNull();
	});

	it('stops the run at its last heartbeat when the person says so, and says it was their choice', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('stop');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(mockStopTimer).toHaveBeenCalledWith(STOPPED_AT_LAST_HEARTBEAT);
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-stale-stopped',
			description: 'toasts.timer.UNFOLLOWED_STOP_CHOSEN_HINT'
		});
		expect(mockSyncTimer).not.toHaveBeenCalled();
	});

	it('stops the run at its last heartbeat once the closed-tab delay is reached without an answer', async () => {
		jest.useFakeTimers();
		const { page, owner } = openAppAfter(7);
		await page.settle();
		expect(page.question()).not.toBeNull();

		// Seven minutes had gone by: three are left before the delay
		await page.settle(3 * MINUTE - 1);
		expect(page.question()).not.toBeNull();
		expect(mockStopTimer).not.toHaveBeenCalled();
		await page.settle(1);

		expect(page.question()).toBeNull();
		expect(mockStopTimer).toHaveBeenCalledWith(STOPPED_AT_LAST_HEARTBEAT);
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-stale-stopped',
			description: 'toasts.timer.STALE_STOPPED_HINT'
		});
		expect(owner.result.current).toBe(true);
	});

	it('leaves alone a run that went on meanwhile, kept from another device', async () => {
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(7)).mockResolvedValue(answerAfterLaterHeartbeat(8));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('stop');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
	});

	it('does nothing when the person answers in another tab, which acts on the answer', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		// What the other tab's answer writes to the storage the tabs share
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'ever-teams.timer.unfollowed-time-answer',
				newValue: JSON.stringify({ timeLogId: 'log-1', at: Date.now() })
			})
		);

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(page.question()).toBeNull();
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockSyncTimer).not.toHaveBeenCalled();
	});

	it.each([
		['keep', 'the run goes on, and the stop is sent', false],
		['stop', 'the run is stopped at its last heartbeat, and the stop has nothing left to end', true]
	] as const)(
		'lets a stop wait until the person has answered (%s): %s',
		async (answer, _outcome, wasStoppedThere) => {
			const { page } = openAppAfter(7);
			await page.waitFor(() => expect(page.question()).not.toBeNull());
			let settled: boolean | undefined;
			void page.whenSettled()?.then((stoppedThere) => {
				settled = stoppedThere;
			});
			await page.settle();
			expect(settled).toBeUndefined();

			await page.answer(answer);

			await page.waitFor(() => expect(settled).toBe(wasStoppedThere));
			expect(page.whenSettled()).toBeNull();
		}
	);

	describe('when the page wakes up from a sleep', () => {
		/** A page that follows the run, a minute after its last heartbeat, with Jest moving the time. */
		const followRun = async () => {
			jest.useFakeTimers();
			jest.setSystemTime(Date.parse(LAST_HEARTBEAT) + MINUTE);
			const page = loadPage();
			mockGetLastTimerLog.mockResolvedValueOnce(lastLogAnswer(1));
			const owner = page.mountOwner();
			await page.settle();
			expect(owner.result.current).toBe(true);
			return { page, owner };
		};

		it('checks again, holds the heartbeat, and asks about the time it slept through', async () => {
			const { page, owner } = await followRun();
			mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(8));

			await page.sleep(7 * MINUTE);

			expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
			expect(page.question()).toEqual(expect.objectContaining({ timeLogId: 'log-1', from: LAST_HEARTBEAT }));
			expect(owner.result.current).toBe(false);
			expect(mockStopTimer).not.toHaveBeenCalled();

			await page.answer('keep');
			await page.settle();
			expect(owner.result.current).toBe(true);
			expect(mockSyncTimer).toHaveBeenCalledTimes(1);
		});

		it('holds a heartbeat that comes due before the page has looked at the clock', async () => {
			const { page } = await followRun();
			mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(8));
			// The computer wakes up: the heartbeat's timer may be the first to run
			jest.setSystemTime(Date.now() + 7 * MINUTE);

			expect(page.isUnsettled()).toBe(true);
			await page.settle();
		});

		it('stops a run it slept through for longer than the delay, and says the app could not follow it', async () => {
			const { page, owner } = await followRun();
			mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(31));

			await page.sleep(30 * MINUTE);

			expect(mockStopTimer).toHaveBeenCalledTimes(1);
			expect(mockStopTimer).toHaveBeenCalledWith({
				source: ETimeLogSource.TEAMS,
				startedAt: STARTED_AT,
				stoppedAt: LAST_HEARTBEAT
			});
			expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
				id: 'timer-stale-stopped',
				description: 'toasts.timer.UNFOLLOWED_STOPPED_HINT'
			});
			expect(page.question()).toBeNull();
			expect(owner.result.current).toBe(true);
		});

		it('carries on with a run another device kept alive meanwhile', async () => {
			const { page, owner } = await followRun();
			// Read a minute after a heartbeat the other device sent
			mockGetLastTimerLog.mockResolvedValue(answerAfterLaterHeartbeat(8));

			await page.sleep(7 * MINUTE);

			expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
			expect(page.question()).toBeNull();
			expect(mockStopTimer).not.toHaveBeenCalled();
			expect(owner.result.current).toBe(true);
		});

		it('does not check again after a sleep of two minutes', async () => {
			const { page, owner } = await followRun();

			await page.sleep(2 * MINUTE);

			expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
			expect(owner.result.current).toBe(true);
			expect(page.isUnsettled()).toBe(false);
		});
	});
});
