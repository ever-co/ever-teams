/** @jest-environment jsdom */
/**
 * The closed-tab rule (#4586): a TEAMS run its tab left running is stopped at its last heartbeat when the app loads.
 * #5118: the check runs once per page load. The timer's owner mounts again within a page (the (main) layout after a
 * page outside it; the offline page used to unmount it too), and a check made again then found the run this page had
 * kept alive stale, with no heartbeat while the owner was unmounted, and stopped it.
 */
import type { ReactNode } from 'react';
import type { RenderHookResult, waitFor as WaitFor } from '@testing-library/react';
import { SYNC_TIMER_INTERVAL } from '@/core/constants/config/constants';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

// Each page below loads React Testing Library afresh, inside a test, where it cannot register its own cleanup
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLastTimerLog = jest.fn();
const mockStopTimer = jest.fn();
const mockToastInfo = jest.fn();
const mockTranslate = (key: string) => key;

jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getLastTimerLog: (...args: unknown[]) => mockGetLastTimerLog(...args),
		stopTimer: (...args: unknown[]) => mockStopTimer(...args)
	}
}));
jest.mock('sonner', () => ({ toast: { info: (...args: unknown[]) => mockToastInfo(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));

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
	/** The timer's owner mounting the guard. */
	mountOwner: () => RenderHookResult<boolean, unknown>;
	waitFor: typeof WaitFor;
	/** Lets the guard's pending work land, `ms` of fake time later. */
	settle: (ms?: number) => Promise<void>;
	/** A sign-out in this page: the cleanups its modules registered, as the sign-out runs them. */
	signOut: () => void;
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
	const { useStaleTimerGuard } = require('./use-stale-timer-guard') as typeof import('./use-stale-timer-guard');
	const { runSignOutCleanups } =
		require('@/core/lib/auth/sign-out-cleanups') as typeof import('@/core/lib/auth/sign-out-cleanups');
	/* eslint-enable @typescript-eslint/no-require-imports */
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const page = {
		mountOwner: () => renderHook(() => useStaleTimerGuard(EMPLOYEE, true), { wrapper }),
		waitFor,
		settle: (ms = 0) =>
			act(async () => {
				jest.advanceTimersByTime(ms);
				// The check's answer goes through a few promise steps before the guard's state is set
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
		signOut: runSignOutCleanups,
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
