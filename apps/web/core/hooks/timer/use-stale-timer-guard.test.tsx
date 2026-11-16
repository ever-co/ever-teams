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
import { timeSlotsBetween } from '@/core/lib/helpers/timer';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';

// Each page below loads React Testing Library afresh, inside a test, where it cannot register its own cleanup
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLastTimerLog = jest.fn();
const mockStopTimer = jest.fn();
const mockCatchUpTimeSlots = jest.fn();
const mockToastInfo = jest.fn();
const mockTranslate = (key: string) => key;

jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getLastTimerLog: (...args: unknown[]) => mockGetLastTimerLog(...args),
		stopTimer: (...args: unknown[]) => mockStopTimer(...args),
		catchUpTimeSlots: (...args: unknown[]) => mockCatchUpTimeSlots(...args)
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
	/** The start guard every timer command shares: the command that holds it, or null. */
	pendingStart: () => Promise<unknown> | null;
	/** A command another timer runs under that guard (a break, a start): null when one already holds it. */
	startUnderGuard: (run: () => Promise<unknown>) => Promise<unknown> | null;
	/** The shell's past-midnight read, for a status that reads stopped in a tab that saw the timer run. */
	mountRunningPastMidnight: () => RenderHookResult<boolean, unknown>;
	/** Runs  as React sees a browser event. */
	act: (change: () => void) => Promise<void>;
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
	const { useStaleTimerGuard, useTimerRunningPastMidnight, isUnfollowedTimeUnsettled, whenUnfollowedTimeIsSettled } =
		require('./use-stale-timer-guard') as typeof import('./use-stale-timer-guard');
	const { answerUnfollowedTime, unfollowedTimeQuestion } =
		require('@/core/lib/utils/timer/unfollowed-time') as typeof import('@/core/lib/utils/timer/unfollowed-time');
	const { lookAtPageClock } =
		require('@/core/lib/utils/timer/page-sleep') as typeof import('@/core/lib/utils/timer/page-sleep');
	const { pendingTimerStart, startUnderTimerGuard } =
		require('./timer-command-guard') as typeof import('./timer-command-guard');
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
		pendingStart: pendingTimerStart,
		startUnderGuard: startUnderTimerGuard,
		mountRunningPastMidnight: () =>
			renderHook(() => useTimerRunningPastMidnight(EMPLOYEE, false, true), { wrapper }),
		act: (change: () => void) =>
			act(async () => {
				change();
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
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
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(30));
		const reopenedOwner = reopened.mountOwner();

		// The heartbeat waits for the check
		expect(reopenedOwner.result.current).toBe(false);
		await reopened.waitFor(() => expect(reopenedOwner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		// It names the run it read: a run started meanwhile is never ended
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: LAST_HEARTBEAT,
			timeLogId: 'log-1'
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
		// One check: its read, and the read its stop makes first
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
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

		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(30));
		const mountedAgain = page.mountOwner();

		await page.waitFor(() => expect(mountedAgain.result.current).toBe(true));
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(3);
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
		// It names the run it read: a run started meanwhile is never ended
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: LAST_HEARTBEAT,
			timeLogId: 'log-1'
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
		mockCatchUpTimeSlots.mockReset().mockResolvedValue({ data: { running: true, lastLog: null } });
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

	it('keeps the whole time since the last heartbeat when the person says so, on a page that just opened', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('keep');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		// The seven minutes from the last heartbeat, for that run: an ordinary heartbeat wrote one minute, on the present
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(1);
		expect(mockCatchUpTimeSlots).toHaveBeenCalledWith(
			expect.objectContaining({
				source: ETimeLogSource.TEAMS,
				employeeId: EMPLOYEE.id,
				timeLogId: 'log-1',
				fromMs: Date.parse(LAST_HEARTBEAT),
				// Gauzy reads the slots of a run from its start
				runStartedAtMs: Date.parse(STARTED_AT)
			})
		);
		const [{ fromMs, toMs }] = mockCatchUpTimeSlots.mock.calls[0];
		// To the present: the milliseconds between the read and the write go on with it
		expect(toMs - fromMs).toBeGreaterThanOrEqual(7 * MINUTE);
		expect(toMs - fromMs).toBeLessThan(7 * MINUTE + 1000);
		const written = timeSlotsBetween(fromMs, toMs).reduce((seconds, slot) => seconds + slot.duration, 0);
		expect(written).toBe(7 * 60);
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
		expect(page.question()).toBeNull();
	});

	it('keeps the time at the next try when its write fails, without asking again, a stop that waits held meanwhile', async () => {
		jest.useFakeTimers();
		const { page, owner } = openAppAfter(7);
		await page.settle();
		expect(page.question()).not.toBeNull();
		const waitingStop = followWaitingStop(page);
		mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));

		await page.answer('keep');
		await page.settle();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(1);
		// The heartbeat stays held: the minute it would write is not the time the person kept
		expect(page.isUnsettled()).toBe(true);
		expect(waitingStop()).toBeUndefined();

		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();
		expect(page.question()).toBeNull();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ timeLogId: 'log-1', fromMs: Date.parse(LAST_HEARTBEAT) })
		);
		expect(waitingStop()).toBe(false);
		expect(owner.result.current).toBe(true);
	});

	it('writes the rest of a Keep whose write failed part way, from the last slot written, without asking again', async () => {
		jest.useFakeTimers();
		const { page, owner } = openAppAfter(7);
		await page.settle();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		// The slot up to 09:00:00 is written, then the next write fails: the run's heartbeat moved to the present
		mockCatchUpTimeSlots.mockImplementationOnce(async ({ onWritten }) => {
			onWritten(heartbeat + 3 * MINUTE);
			throw new Error('Network Error');
		});

		await page.answer('keep');
		await page.settle();
		mockGetLastTimerLog.mockResolvedValue(answerAfterLaterHeartbeat(8));
		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();

		expect(page.question()).toBeNull();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		const [{ fromMs, toMs }] = mockCatchUpTimeSlots.mock.calls[1];
		expect(fromMs).toBe(heartbeat + 3 * MINUTE);
		// On to the present: the minute the retry waited is time the person kept too
		expect(toMs).toBe(heartbeat + 8 * MINUTE);
		expect(owner.result.current).toBe(true);
	});

	it('lets another tab write a Keep this tab could not, once: this tab then finds nothing owed and writes nothing again', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const first = openAppAfter(7);
		await first.page.settle();
		expect(first.page.question()).not.toBeNull();
		mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));
		await first.page.answer('keep');
		await first.page.settle();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(1);

		// Another tab of the browser checks the run: it writes what the first one owes, without asking again
		const second = loadPage();
		const secondOwner = second.mountOwner();
		await second.settle();
		expect(second.question()).toBeNull();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(expect.objectContaining({ fromMs: heartbeat }));
		expect(secondOwner.result.current).toBe(true);

		// The first tab tries again a minute later, the heartbeat moved by that write: nothing is written twice
		mockGetLastTimerLog.mockResolvedValue(answerAfterLaterHeartbeat(8));
		await first.page.settle(SYNC_TIMER_INTERVAL);
		await first.page.settle();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(first.owner.result.current).toBe(true);
	});

	it('hands the slot sent without an answer to the next load, which writes it again only if its window lacks it', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const { page, owner } = openAppAfter(7);
		await page.settle();
		const sent = {
			startedAt: LAST_HEARTBEAT,
			untilMs: heartbeat + 7 * MINUTE,
			duration: 420,
			windowBefore: 120
		};
		// The slot is sent, and its answer never comes: Gauzy may hold it, or not
		mockCatchUpTimeSlots.mockImplementationOnce(async ({ onSending }) => {
			onSending(sent);
			throw new Error('Network Error');
		});
		await page.answer('keep');
		await page.settle();
		owner.unmount();

		const reloaded = loadPage();
		reloaded.mountOwner();
		await reloaded.settle();

		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ fromMs: heartbeat, unanswered: sent })
		);
	});

	it('writes the rest of a Keep after a reload, from the last slot written, without asking again', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const { page, owner } = openAppAfter(7);
		await page.settle();
		// The slots up to 09:03 are written, then the next write fails: the run's heartbeat moved to the present
		mockCatchUpTimeSlots.mockImplementationOnce(async ({ onWritten }) => {
			onWritten(heartbeat + 3 * MINUTE);
			throw new Error('Network Error');
		});
		await page.answer('keep');
		await page.settle();
		owner.unmount();

		// The person reloads a minute later: the run reads as followed a minute ago
		mockGetLastTimerLog.mockResolvedValue(answerAfterLaterHeartbeat(8));
		const reloaded = loadPage();
		const reloadedOwner = reloaded.mountOwner();
		await reloaded.settle();

		expect(reloaded.question()).toBeNull();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		const [{ fromMs, toMs }] = mockCatchUpTimeSlots.mock.calls[1];
		expect(fromMs).toBe(heartbeat + 3 * MINUTE);
		expect(toMs).toBe(heartbeat + 8 * MINUTE);
		expect(reloadedOwner.result.current).toBe(true);
	});

	it('stops the run where the person kept it when the app opens long after a Keep it could not write', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const { page, owner } = openAppAfter(7);
		await page.settle();
		mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));
		await page.answer('keep');
		await page.settle();
		owner.unmount();

		// The app opens again twenty minutes after the Keep: nobody followed the run since
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(27));
		const reopened = loadPage();
		const reopenedOwner = reopened.mountOwner();
		await reopened.settle();

		// Writing to the running run would move its end to the present: it is stopped where the time kept ends first
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: new Date(heartbeat + 7 * MINUTE),
			timeLogId: 'log-1'
		});
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-stale-stopped',
			description: 'toasts.timer.UNFOLLOWED_STOPPED_HINT'
		});
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ fromMs: heartbeat, toMs: heartbeat + 7 * MINUTE })
		);
		expect(reopened.question()).toBeNull();
		expect(reopenedOwner.result.current).toBe(true);
	});

	it('writes the rest of a Keep for a run stopped since, though no timer runs when the app opens again', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const { page, owner } = openAppAfter(7);
		await page.settle();
		mockCatchUpTimeSlots.mockImplementationOnce(async ({ onWritten }) => {
			onWritten(heartbeat + 3 * MINUTE);
			throw new Error('Network Error');
		});
		await page.answer('keep');
		await page.settle();
		owner.unmount();

		// Stopped from another device before the app opens again: the employee tracks no time any more
		const stopped = answerAfterLaterHeartbeat(30);
		stopped.data[0].lastLog.isRunning = false;
		mockGetLastTimerLog.mockResolvedValue(stopped);
		const reopened = loadPage();
		const reopenedOwner = reopened.mountOwner({ ...EMPLOYEE, isTrackingTime: false });
		await reopened.settle();

		// The rest of the time kept goes to that run, and its end does not move
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ fromMs: heartbeat + 3 * MINUTE, toMs: heartbeat + 7 * MINUTE })
		);
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(reopenedOwner.result.current).toBe(true);
	});

	it('waits to write a Keep owed to a run another device followed since, until the time after its heartbeat is settled', async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		const { page, owner } = openAppAfter(7);
		await page.settle();
		mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));
		await page.answer('keep');
		await page.settle();
		owner.unmount();

		// Another device sent a heartbeat at 09:09, then closed: the app opens again at 10:00
		let isRunning = true;
		mockGetLastTimerLog.mockImplementation(async () => {
			const answered = lastLogAnswer(60);
			Object.assign(answered.data[0].lastLog, { stoppedAt: '2026-11-12T09:09:00.000Z', isRunning });
			return answered;
		});
		mockStopTimer.mockImplementation(async () => {
			isRunning = false;
			return { data: { running: false } };
		});
		const reopened = loadPage();
		const reopenedOwner = reopened.mountOwner();
		await reopened.settle();

		// The 51 minutes after that heartbeat are not counted: the run is stopped there first, as a closed tab's is
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: STARTED_AT,
			stoppedAt: '2026-11-12T09:09:00.000Z',
			timeLogId: 'log-1'
		});
		// Then the time kept is written to the stopped run, whose end does not move
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ fromMs: heartbeat, toMs: heartbeat + 7 * MINUTE })
		);
		expect(mockStopTimer.mock.invocationCallOrder[0]).toBeLessThan(
			mockCatchUpTimeSlots.mock.invocationCallOrder[1]
		);
		expect(reopenedOwner.result.current).toBe(true);
	});

	it('writes a Keep whose write failed at the next try even past the closed-tab delay, rather than stop the run', async () => {
		jest.useFakeTimers();
		const page = loadPage();
		// Kept at nine and a half minutes; read again a minute later, past the ten-minute delay
		const answerAt = (minutes: number) => lastLogAnswer(minutes);
		mockGetLastTimerLog.mockResolvedValue(answerAt(9.5));
		const owner = page.mountOwner();
		await page.settle();
		expect(page.question()).not.toBeNull();
		mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));

		await page.answer('keep');
		await page.settle();
		mockGetLastTimerLog.mockResolvedValue(answerAt(10.5));
		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
		expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
			expect.objectContaining({ fromMs: Date.parse(LAST_HEARTBEAT) })
		);
		expect(owner.result.current).toBe(true);
	});

	it("keeps the time on the computer's clock where the API gives no clock, not five minutes less", async () => {
		jest.useFakeTimers();
		const heartbeat = Date.parse(LAST_HEARTBEAT);
		// Nine minutes away. Without Gauzy's clock the closed-tab rule allows the computer's five fast: it asks
		jest.setSystemTime(heartbeat + 9 * MINUTE);
		const page = loadPage();
		const withoutClock = lastLogAnswer(9);
		Object.assign(withoutClock, { headers: {} });
		mockGetLastTimerLog.mockResolvedValue(withoutClock);
		const owner = page.mountOwner();
		await page.settle();
		expect(page.question()).not.toBeNull();

		await page.answer('keep');
		await page.settle();

		expect(mockCatchUpTimeSlots).toHaveBeenCalledWith(
			expect.objectContaining({ fromMs: heartbeat, toMs: heartbeat + 9 * MINUTE })
		);
		expect(owner.result.current).toBe(true);
	});

	it('keeps nothing when another device stopped the run and started another before the answer, and says so', async () => {
		const page = loadPage();
		const replacement = lastLogAnswer(8);
		replacement.data[0].lastLog.id = 'log-2';
		// Read as the check starts and as it asks; read again just before the keep, once the other device replaced it
		mockGetLastTimerLog
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValue(replacement);
		const owner = page.mountOwner();
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		const waitingStop = followWaitingStop(page);

		await page.answer('keep');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		// The other run is not credited the time, and the run asked about ended: a stop that waited sends nothing
		expect(mockCatchUpTimeSlots).not.toHaveBeenCalled();
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.UNFOLLOWED_KEEP_CHANGED', {
			id: 'timer-unfollowed-keep-changed'
		});
		expect(waitingStop()).toBe(true);
		expect(window.localStorage.getItem('ever-teams.timer.unfollowed-time-settled')).toBeNull();
	});

	it('keeps nothing more when the run was kept from another device before the answer, and says so', async () => {
		const page = loadPage();
		mockGetLastTimerLog
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValue(answerAfterLaterHeartbeat(8));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		const waitingStop = followWaitingStop(page);

		await page.answer('keep');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockCatchUpTimeSlots).not.toHaveBeenCalled();
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.UNFOLLOWED_KEEP_CHANGED', expect.anything());
		// The run goes on: the stop that waited is sent
		expect(waitingStop()).toBe(false);
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
		expect(mockCatchUpTimeSlots).not.toHaveBeenCalled();
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
		// Read as the check starts and as it asks; read again before the stop, once the other device kept it
		mockGetLastTimerLog
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValueOnce(lastLogAnswer(7))
			.mockResolvedValue(answerAfterLaterHeartbeat(8));
		const owner = page.mountOwner();
		await page.waitFor(() => expect(page.question()).not.toBeNull());

		await page.answer('stop');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastInfo).not.toHaveBeenCalled();
	});

	/** What another tab writes to the storage the tabs share once it settled the time of the run, as this tab hears it. */
	const settledInAnotherTab = (kept: boolean) => {
		const key = 'ever-teams.timer.unfollowed-time-settled';
		const newValue = JSON.stringify({ timeLogId: 'log-1', from: LAST_HEARTBEAT, kept, at: Date.now() });
		window.localStorage.setItem(key, newValue);
		return new StorageEvent('storage', { key, newValue });
	};
	/** Gauzy's answer once the run was stopped at its last heartbeat. */
	const answerOnceStopped = () => {
		const answered = lastLogAnswer(8);
		answered.data[0].lastLog.isRunning = false;
		return answered;
	};
	/** Follows what a stop that waits for the time to be settled learns: whether the run ended meanwhile. */
	const followWaitingStop = (page: Page) => {
		let endedMeanwhile: boolean | undefined;
		void page.whenSettled()?.then((ended) => {
			endedMeanwhile = ended;
		});
		return () => endedMeanwhile;
	};

	it('reads the run again once another tab settled its time, and a stop that waited sends nothing once it was stopped there', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		const waitingStop = followWaitingStop(page);

		// The other tab stopped the run at its last heartbeat, then told the tabs of the browser
		mockGetLastTimerLog.mockResolvedValue(answerOnceStopped());
		await page.act(() => window.dispatchEvent(settledInAnotherTab(false)));

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(page.question()).toBeNull();
		expect(waitingStop()).toBe(true);
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockCatchUpTimeSlots).not.toHaveBeenCalled();
	});

	it('carries on, asking nothing more, once another tab kept that time', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		const waitingStop = followWaitingStop(page);

		// Its heartbeat failed: the run still reads as it was, and the answer stands all the same
		await page.act(() => window.dispatchEvent(settledInAnotherTab(true)));

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(page.question()).toBeNull();
		// The run goes on: the stop that waited is sent
		expect(waitingStop()).toBe(false);
		expect(mockStopTimer).not.toHaveBeenCalled();
	});

	it('tells the other tabs of an answer only once it is applied: a stop that waited there cannot land first', async () => {
		const { page } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		let applyStop: () => void = () => undefined;
		mockStopTimer.mockReturnValueOnce(
			new Promise((resolve) => {
				applyStop = () => resolve({ data: { running: false } });
			})
		);
		const told = () =>
			Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter(
				(key) => key?.startsWith('ever-teams.timer.unfollowed-time')
			);

		await page.answer('stop');
		await page.waitFor(() => expect(mockStopTimer).toHaveBeenCalledTimes(1));
		expect(told()).toEqual([]);

		await page.act(applyStop);
		await page.waitFor(() => expect(told()).toEqual(['ever-teams.timer.unfollowed-time-settled']));
	});

	it('stops the run at its last heartbeat under the start guard every timer shares', async () => {
		const { page } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		let applyStop: () => void = () => undefined;
		mockStopTimer.mockReturnValueOnce(
			new Promise((resolve) => {
				applyStop = () => resolve({ data: { running: false } });
			})
		);

		await page.answer('stop');
		await page.waitFor(() => expect(mockStopTimer).toHaveBeenCalledTimes(1));

		// A start asked now waits for the stop, or is refused: it cannot end the run at the present meanwhile
		expect(page.pendingStart()).not.toBeNull();
		await page.act(applyStop);
		await page.waitFor(() => expect(page.pendingStart()).toBeNull());
	});

	it('never waits for a break holding the start guard, whose stop of the work waits for this time: neither would end', async () => {
		const { page, owner } = openAppAfter(7);
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		// Take a break, pressed as the page woke up: under the start guard, its stop of the work waits for the answer
		let workStopEndedNothing: boolean | null | undefined;
		const breakStart = page.startUnderGuard(async () => {
			workStopEndedNothing = await page.whenSettled();
		});

		await page.answer('stop');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledWith(STOPPED_AT_LAST_HEARTBEAT);
		// The run ended at its last heartbeat: the break's stop of the work sends nothing, and the break goes on
		await page.waitFor(() => expect(workStopEndedNothing).toBe(true));
		await breakStart;
		expect(page.pendingStart()).toBeNull();
	});

	it('holds a stop that waits for the first check of the page while that check fails, until one goes through', async () => {
		jest.useFakeTimers();
		const page = loadPage();
		mockGetLastTimerLog.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(lastLogAnswer(30));
		const owner = page.mountOwner();
		const waitingStop = followWaitingStop(page);

		await page.settle();
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);
		// Sent now, the stop would end the run at the present, with the time the app did not follow in it
		expect(waitingStop()).toBeUndefined();
		expect(page.isUnsettled()).toBe(true);
		expect(page.whenSettled()).not.toBeNull();

		// The check runs again a minute later, and stops the run a closed tab left at its last heartbeat
		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();
		expect(mockStopTimer).toHaveBeenCalledWith(STOPPED_AT_LAST_HEARTBEAT);
		expect(waitingStop()).toBe(true);
		expect(owner.result.current).toBe(true);
	});

	it('keeps a stop waiting through a check that fails, and has that check tried again at once', async () => {
		jest.useFakeTimers();
		const page = loadPage();
		mockGetLastTimerLog.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(lastLogAnswer(1));
		const owner = page.mountOwner();
		await page.settle();
		// The check failed: what becomes of the time since the last heartbeat is still to be settled
		expect(owner.result.current).toBe(false);
		expect(page.isUnsettled()).toBe(true);
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1);

		let waitingStop: () => boolean | undefined = () => undefined;
		await page.act(() => {
			waitingStop = followWaitingStop(page);
		});
		await page.settle();

		// No minute went by: the stop had the check tried again, and goes ahead now that it went through
		expect(mockGetLastTimerLog).toHaveBeenCalledTimes(2);
		expect(waitingStop()).toBe(false);
		expect(owner.result.current).toBe(true);
	});

	it('keeps a stop waiting when the check under way fails, until one goes through', async () => {
		jest.useFakeTimers();
		const page = loadPage();
		let failTheCheck: (error: Error) => void = () => undefined;
		mockGetLastTimerLog
			.mockReturnValueOnce(
				new Promise((_resolve, reject) => {
					failTheCheck = reject;
				})
			)
			.mockResolvedValue(lastLogAnswer(1));
		const owner = page.mountOwner();
		await page.settle();
		const waitingStop = followWaitingStop(page);

		await page.act(() => failTheCheck(new Error('Network Error')));
		await page.settle();

		// Sent now, the stop would end the run at the present whatever the time since its last heartbeat
		expect(waitingStop()).toBeUndefined();
		expect(page.isUnsettled()).toBe(true);

		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();
		expect(waitingStop()).toBe(false);
		expect(owner.result.current).toBe(true);
	});

	it.each([
		['stop', false, () => mockStopTimer],
		['keep', true, () => mockCatchUpTimeSlots]
	] as const)(
		'tells the other tabs once the answer (%s) is applied, not as it is given: a stop that waits there waits on',
		async (answer, kept, request) => {
			const { page, owner } = openAppAfter(7);
			await page.waitFor(() => expect(page.question()).not.toBeNull());
			let answerOfTheApi: (value: unknown) => void = () => undefined;
			request()
				.mockReset()
				.mockReturnValue(
					new Promise((resolve) => {
						answerOfTheApi = resolve;
					})
				);
			const shared = () => window.localStorage.getItem('ever-teams.timer.unfollowed-time-settled');

			await page.answer(answer);
			await page.waitFor(() => expect(request()).toHaveBeenCalledTimes(1));

			// The request is on its way: nothing is settled yet, here or in the other tabs
			expect(shared()).toBeNull();
			expect(page.isUnsettled()).toBe(true);

			await page.act(() => answerOfTheApi({ data: { running: answer === 'keep', lastLog: null } }));
			await page.waitFor(() => expect(owner.result.current).toBe(true));
			expect(JSON.parse(String(shared()))).toEqual(
				expect.objectContaining({ timeLogId: 'log-1', from: LAST_HEARTBEAT, kept })
			);
		}
	);

	it('applies the stop the person chose at the next try when it failed, without asking again, a stop that waits held meanwhile', async () => {
		jest.useFakeTimers();
		const { page, owner } = openAppAfter(7);
		await page.settle();
		expect(page.question()).not.toBeNull();
		const waitingStop = followWaitingStop(page);
		mockStopTimer.mockRejectedValueOnce(new Error('Network Error'));

		await page.answer('stop');
		await page.settle();
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
		expect(waitingStop()).toBeUndefined();
		expect(page.isUnsettled()).toBe(true);

		await page.settle(SYNC_TIMER_INTERVAL);
		await page.settle();
		expect(page.question()).toBeNull();
		expect(mockStopTimer).toHaveBeenCalledTimes(2);
		expect(mockStopTimer).toHaveBeenLastCalledWith(STOPPED_AT_LAST_HEARTBEAT);
		expect(mockToastInfo).toHaveBeenCalledWith('toasts.timer.STALE_STOPPED', {
			id: 'timer-stale-stopped',
			description: 'toasts.timer.UNFOLLOWED_STOP_CHOSEN_HINT'
		});
		expect(waitingStop()).toBe(true);
		expect(owner.result.current).toBe(true);
	});

	it('never asks about a break, which is never counted: no time of it to keep, no run to stop', async () => {
		const page = loadPage();
		const onBreak = lastLogAnswer(7);
		Object.assign(onBreak.data[0].lastLog, { logType: ETimeLogType.BREAK });
		mockGetLastTimerLog.mockResolvedValue(onBreak);

		const owner = page.mountOwner();

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(page.question()).toBeNull();
		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockCatchUpTimeSlots).not.toHaveBeenCalled();
	});

	it('sends no heartbeat during a break, which the status reads stopped: a heartbeat would count it as tracked time', async () => {
		const page = loadPage();
		const onBreak = lastLogAnswer(1);
		Object.assign(onBreak.data[0].lastLog, { logType: ETimeLogType.BREAK });
		mockGetLastTimerLog.mockResolvedValue(onBreak);

		const runningPastMidnight = page.mountRunningPastMidnight();

		await page.waitFor(() => expect(mockGetLastTimerLog).toHaveBeenCalled());
		await page.settle();
		expect(runningPastMidnight.result.current).toBe(false);
	});

	it('keeps the heartbeat of work the status reads stopped past midnight', async () => {
		const page = loadPage();
		mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(1));

		const runningPastMidnight = page.mountRunningPastMidnight();

		await page.waitFor(() => expect(runningPastMidnight.result.current).toBe(true));
	});

	it('asks about a run whose last heartbeat was before midnight, and stops it there for the day it started', async () => {
		const page = loadPage();
		const beforeMidnight = '2026-11-12T23:58:00.000Z';
		const answered = lastLogAnswer(7);
		Object.assign(answered.data[0].lastLog, { startedAt: '2026-11-12T21:00:00.000Z', stoppedAt: beforeMidnight });
		answered.headers.date = new Date(Date.parse(beforeMidnight) + 7 * MINUTE).toUTCString();
		mockGetLastTimerLog.mockResolvedValue(answered);
		const owner = page.mountOwner();
		await page.waitFor(() => expect(page.question()).not.toBeNull());
		expect(page.question()).toEqual(expect.objectContaining({ from: beforeMidnight }));

		await page.answer('stop');

		await page.waitFor(() => expect(owner.result.current).toBe(true));
		expect(mockStopTimer).toHaveBeenCalledWith({
			source: ETimeLogSource.TEAMS,
			startedAt: '2026-11-12T21:00:00.000Z',
			stoppedAt: beforeMidnight,
			timeLogId: 'log-1'
		});
	});

	describe('with two tabs open', () => {
		/** Web Locks as a browser shares them between its tabs: one holder at a time, in the order asked. */
		const shareLocksBetweenTabs = () => {
			let queue: Promise<unknown> = Promise.resolve();
			const locks = {
				request: (_name: string, callback: () => Promise<unknown>) => {
					const held = queue.then(() => callback());
					queue = held.catch(() => undefined);
					return held;
				}
			};
			Object.defineProperty(navigator, 'locks', { configurable: true, value: locks });
		};
		let visibility: DocumentVisibilityState = 'visible';

		beforeEach(() => {
			visibility = 'visible';
			Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
		});

		afterEach(() => {
			delete (navigator as { locks?: unknown }).locks;
			delete (document as { visibilityState?: unknown }).visibilityState;
		});

		it('writes in the waiting tab the Keep the asking tab could not write, rather than ask again', async () => {
			shareLocksBetweenTabs();
			mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(7));
			const first = loadPage();
			first.mountOwner();
			await first.waitFor(() => expect(first.question()).not.toBeNull());
			const second = loadPage();
			const secondOwner = second.mountOwner();
			await second.settle();
			expect(second.question()).toBeNull();

			mockCatchUpTimeSlots.mockRejectedValueOnce(new Error('Network Error'));
			await first.answer('keep');

			await second.waitFor(() => expect(secondOwner.result.current).toBe(true));
			expect(second.question()).toBeNull();
			expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
			expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
				expect.objectContaining({ fromMs: Date.parse(LAST_HEARTBEAT) })
			);
			expect(
				window.localStorage.getItem(`ever-teams.timer.owed-keep.log-1@${Date.parse(LAST_HEARTBEAT)}`)
			).toBeNull();
		});

		it('writes in the waiting tab the rest of a Keep the asking tab wrote in part, though the run reads as followed', async () => {
			shareLocksBetweenTabs();
			const heartbeat = Date.parse(LAST_HEARTBEAT);
			mockGetLastTimerLog.mockResolvedValue(lastLogAnswer(7));
			const first = loadPage();
			first.mountOwner();
			await first.waitFor(() => expect(first.question()).not.toBeNull());
			const second = loadPage();
			const secondOwner = second.mountOwner();
			await second.settle();
			// The first slot is written, which moves the run's heartbeat to the present, then the next write fails
			mockCatchUpTimeSlots.mockImplementationOnce(async ({ onWritten }) => {
				onWritten(heartbeat + 3 * MINUTE);
				mockGetLastTimerLog.mockResolvedValue(answerAfterLaterHeartbeat(8));
				throw new Error('Network Error');
			});

			await first.answer('keep');

			await second.waitFor(() => expect(secondOwner.result.current).toBe(true));
			expect(second.question()).toBeNull();
			expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(2);
			expect(mockCatchUpTimeSlots).toHaveBeenLastCalledWith(
				expect.objectContaining({ fromMs: heartbeat + 3 * MINUTE })
			);
		});

		it('asks in one tab only: the other finds the time settled, and a stop that waited there sends nothing', async () => {
			shareLocksBetweenTabs();
			let isRunning = true;
			mockGetLastTimerLog.mockImplementation(async () => {
				const answered = lastLogAnswer(7);
				answered.data[0].lastLog.isRunning = isRunning;
				return answered;
			});
			mockStopTimer.mockImplementation(async () => {
				isRunning = false;
				return { data: { running: false } };
			});
			const first = loadPage();
			const firstOwner = first.mountOwner();
			await first.waitFor(() => expect(first.question()).not.toBeNull());

			const second = loadPage();
			const secondOwner = second.mountOwner();
			await second.settle();
			const waitingStop = followWaitingStop(second);
			await second.settle();
			expect(second.question()).toBeNull();
			expect(secondOwner.result.current).toBe(false);

			await first.answer('stop');

			await first.waitFor(() => expect(firstOwner.result.current).toBe(true));
			await second.waitFor(() => expect(secondOwner.result.current).toBe(true));
			expect(second.question()).toBeNull();
			expect(mockStopTimer).toHaveBeenCalledTimes(1);
			expect(waitingStop()).toBe(true);
		});

		it('asks nothing in a tab the person cannot see until it shows, and puts the question again where they come back', async () => {
			visibility = 'hidden';
			const { page, owner } = openAppAfter(7);
			await page.waitFor(() => expect(mockGetLastTimerLog).toHaveBeenCalledTimes(1));
			await page.settle();
			expect(page.question()).toBeNull();
			expect(owner.result.current).toBe(false);
			expect(page.isUnsettled()).toBe(true);

			const showPage = (state: DocumentVisibilityState) =>
				page.act(() => {
					visibility = state;
					document.dispatchEvent(new Event('visibilitychange'));
				});
			await showPage('visible');
			await page.waitFor(() => expect(page.question()).not.toBeNull());

			// The person goes to another tab before answering: the question goes, and nothing is settled
			await showPage('hidden');
			await page.waitFor(() => expect(page.question()).toBeNull());
			expect(mockStopTimer).not.toHaveBeenCalled();
			expect(page.isUnsettled()).toBe(true);

			await showPage('visible');
			await page.waitFor(() => expect(page.question()).not.toBeNull());
		});
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

			// Read as the check starts, and again as it asks: another tab may have settled it meanwhile
			expect(mockGetLastTimerLog).toHaveBeenCalledTimes(3);
			expect(page.question()).toEqual(expect.objectContaining({ timeLogId: 'log-1', from: LAST_HEARTBEAT }));
			expect(owner.result.current).toBe(false);
			expect(mockStopTimer).not.toHaveBeenCalled();

			await page.answer('keep');
			await page.settle();
			expect(owner.result.current).toBe(true);
			expect(mockCatchUpTimeSlots).toHaveBeenCalledTimes(1);
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
				stoppedAt: LAST_HEARTBEAT,
				timeLogId: 'log-1'
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
