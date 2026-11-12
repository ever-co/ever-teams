/** @jest-environment jsdom */
/**
 * The closed-tab rule (#4586): a TEAMS run its tab left running is stopped at its last heartbeat when the app loads.
 * #5118: the check runs once per page load. The timer's owner mounts again within a page (the (main) layout after a
 * page outside it; the offline page used to unmount it too), and a check made again then found the run this page had
 * kept alive stale, with no heartbeat while the owner was unmounted, and stopped it.
 */
import type { ReactNode } from 'react';
import type { RenderHookResult, waitFor as WaitFor } from '@testing-library/react';
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
	cleanup: () => void;
}

let pages: Page[] = [];

/** A page load: the app's modules evaluated afresh, as a reload evaluates them. */
function loadPage(): Page {
	jest.resetModules();
	/* eslint-disable @typescript-eslint/no-require-imports */
	const { createElement } = require('react') as typeof import('react');
	const { cleanup, renderHook, waitFor } =
		require('@testing-library/react') as typeof import('@testing-library/react');
	const { QueryClient, QueryClientProvider } =
		require('@tanstack/react-query') as typeof import('@tanstack/react-query');
	const { useStaleTimerGuard } = require('./use-stale-timer-guard') as typeof import('./use-stale-timer-guard');
	/* eslint-enable @typescript-eslint/no-require-imports */
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const page = {
		mountOwner: () => renderHook(() => useStaleTimerGuard(EMPLOYEE, true), { wrapper }),
		waitFor,
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

	it('runs a check that failed again, the heartbeat held meanwhile', async () => {
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
