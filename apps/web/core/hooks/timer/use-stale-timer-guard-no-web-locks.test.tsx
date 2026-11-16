/** @jest-environment jsdom */
/**
 * A Keep's catch-up in a browser without Web Locks (#5123). A page served over plain HTTP is not a secure context:
 * `navigator.locks` is missing there, and the tabs of the browser used to settle the time without the app all at
 * once. Two tabs that found the same owed Keep both wrote it, and Gauzy, which adds every slot it is sent, counted
 * those minutes twice. The window read of #5367 does not prevent it: it judges only a slot sent before without an
 * answer, never a slot another tab is sending at the same moment.
 *
 * Each tab here is a page load of its own (its modules evaluated afresh), and the tabs share the browser's storage.
 * The catch-up runs for real against a fake Gauzy that adds up each 10-minute window's seconds, capped at 600 as its
 * merge does.
 */
import type { ReactNode } from 'react';
import type { RenderHookResult, waitFor as WaitFor } from '@testing-library/react';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

// Each page below loads React Testing Library afresh, inside a test, where it cannot register its own cleanup
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetLastTimerLog = jest.fn();
const mockStopTimer = jest.fn();
const mockGauzyPost = jest.fn();
const mockGauzyGet = jest.fn();

// Proxy mode, whatever NEXT_PUBLIC_GAUZY_API_SERVER_URL the env files loaded for Jest set; the shipped closed-tab delay
jest.mock('@/core/constants/config/constants', () => {
	const constants = jest.requireActual<typeof import('@/core/constants/config/constants')>(
		'@/core/constants/config/constants'
	);
	return {
		...constants,
		GAUZY_API_BASE_SERVER_URL: { value: undefined },
		STALE_TIMER_THRESHOLD: { value: constants.STALE_TIMER_THRESHOLD_MS }
	};
});
jest.mock('@/core/services/client/api.service', () => ({
	...jest.requireActual('@/core/services/client/api.service'),
	getFallbackAPI: async () => ({ post: mockGauzyPost, get: mockGauzyGet })
}));
// The run is read and stopped by the mocks; the slots of the Keep are written by each tab's own timer service
jest.mock('@/core/services/client/api/timers', () => {
	const { timerService } = jest.requireActual<typeof import('@/core/services/client/api/timers')>(
		'@/core/services/client/api/timers'
	);
	return {
		timerService: {
			getLastTimerLog: (...args: unknown[]) => mockGetLastTimerLog(...args),
			stopTimer: (...args: unknown[]) => mockStopTimer(...args),
			catchUpTimeSlots: (args: Parameters<typeof timerService.catchUpTimeSlots>[0]) =>
				timerService.catchUpTimeSlots(args)
		}
	};
});
jest.mock('sonner', () => ({ toast: { info: jest.fn() } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));

const EMPLOYEE = { id: 'employee-1', isTrackingTime: false };
/** The run started at 09:04: the 09:00 window held 120 seconds of it when its last heartbeat came, at 09:06. */
const STARTED_AT = '2026-11-12T09:04:00.000Z';
const HEARTBEAT = Date.parse('2026-11-12T09:06:00.000Z');
/** The person kept the time up to 09:13: 240 seconds of the 09:00 window, and 180 of the 09:10 one. */
const KEPT_UNTIL = Date.parse('2026-11-12T09:13:00.000Z');
const OWED_KEY = `ever-teams.timer.owed-keep.log-1@${HEARTBEAT}`;
const LEASE_KEY = 'ever-teams.timer.one-tab-lease';
const WINDOW_MS = 600_000;
const WINDOW_0900 = Date.parse('2026-11-12T09:00:00.000Z');
const WINDOW_0910 = Date.parse('2026-11-12T09:10:00.000Z');

/** Gauzy's windows of slots: the seconds each holds, added up per slot and capped at 600, as its merge does. */
const gauzy = new Map<number, number>();
/** The employee's last log as Gauzy has it: a slot written to the running run moves its end to Gauzy's present. */
const run = { id: 'log-1', source: ETimeLogSource.TEAMS, isRunning: false, startedAt: STARTED_AT, stoppedAt: '' };
/** Gauzy's present: seven minutes after the last heartbeat, within the closed-tab delay, so the person is asked. */
const GAUZY_NOW = KEPT_UNTIL;

interface Tab {
	mountOwner: (employee?: typeof EMPLOYEE) => RenderHookResult<boolean, unknown>;
	waitFor: typeof WaitFor;
	/** The question about time without the app that waits for an answer in this tab, or null. */
	question: () => unknown;
	/** The person's answer to it, in this tab. */
	answer: (answer: 'keep' | 'stop') => Promise<void>;
	signOut: () => void;
	cleanup: () => void;
}

let tabs: Tab[] = [];

/** A tab of the browser: the app's modules evaluated afresh, as a page load evaluates them. */
function openTab(): Tab {
	jest.resetModules();
	/* eslint-disable @typescript-eslint/no-require-imports */
	const { createElement } = require('react') as typeof import('react');
	const { act, cleanup, renderHook, waitFor } =
		require('@testing-library/react') as typeof import('@testing-library/react');
	const { QueryClient, QueryClientProvider } =
		require('@tanstack/react-query') as typeof import('@tanstack/react-query');
	const { useStaleTimerGuard } = require('./use-stale-timer-guard') as typeof import('./use-stale-timer-guard');
	const { answerUnfollowedTime, unfollowedTimeQuestion } =
		require('@/core/lib/utils/timer/unfollowed-time') as typeof import('@/core/lib/utils/timer/unfollowed-time');
	const { runSignOutCleanups } =
		require('@/core/lib/auth/sign-out-cleanups') as typeof import('@/core/lib/auth/sign-out-cleanups');
	/* eslint-enable @typescript-eslint/no-require-imports */
	const queryClient = new QueryClient();
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	const tab: Tab = {
		mountOwner: (employee = EMPLOYEE) => renderHook(() => useStaleTimerGuard(employee, true), { wrapper }),
		waitFor,
		question: unfollowedTimeQuestion,
		answer: (answer) =>
			act(async () => {
				answerUnfollowedTime(answer);
				for (let step = 0; step < 20; step += 1) await Promise.resolve();
			}),
		signOut: runSignOutCleanups,
		cleanup
	};
	tabs.push(tab);
	return tab;
}

/** Gauzy's answer to a window read: the slots it holds up to the end of the dates read. */
async function readWindows(url: string) {
	const endDate = Date.parse(new URLSearchParams(url.split('?')[1]).get('endDate') ?? '');
	return {
		data: [...gauzy]
			.filter(([window]) => window <= endDate)
			.map(([window, duration]) => ({ startedAt: new Date(window).toISOString(), duration }))
	};
}

/** Holds the next window read until the function this answers is called. */
function holdNextWindowRead(): () => void {
	let release: () => void = () => undefined;
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	mockGauzyGet.mockImplementationOnce(async (url: string) => {
		await released;
		return readWindows(url);
	});
	return () => release();
}

/**
 * How long an assertion waits: each tab loads its own Testing Library, which jest.setup.ts's longer CI wait does not
 * reach, and loads the app's modules afresh.
 */
const WAIT = { timeout: 10_000 };

/** Lets the tabs run on for a moment of real time: a tab racing another one would have written by then. */
const aMoment = () => new Promise((resolve) => setTimeout(resolve, 150));

/** What a Keep left owed when its write failed before any slot of it was written. */
function oweTheKeep(): void {
	window.localStorage.setItem(
		OWED_KEY,
		JSON.stringify({
			employeeId: EMPLOYEE.id,
			timeLogId: 'log-1',
			heartbeat: HEARTBEAT,
			fromMs: HEARTBEAT,
			toMs: KEPT_UNTIL,
			apiOffsetMs: 0,
			writtenAtMs: KEPT_UNTIL,
			keptAt: Date.now()
		})
	);
}

describe('useStaleTimerGuard, in a browser without Web Locks', () => {
	beforeEach(() => {
		expect((navigator as { locks?: unknown }).locks).toBeUndefined();
		window.localStorage.clear();
		gauzy.clear();
		gauzy.set(WINDOW_0900, 120);
		mockStopTimer.mockReset().mockResolvedValue({ data: { running: false } });
		// By default the run was stopped since the Keep, from another device: the rest of the time kept is written to it
		Object.assign(run, { isRunning: false, stoppedAt: new Date(HEARTBEAT).toISOString() });
		mockGetLastTimerLog.mockReset().mockImplementation(async () => ({
			data: [{ lastLog: { ...run } }],
			headers: { date: new Date(GAUZY_NOW).toUTCString() }
		}));
		mockGauzyPost
			.mockReset()
			.mockImplementation(async (_url: string, body: { startedAt: string; duration: number }) => {
				const window = Math.floor(Date.parse(body.startedAt) / WINDOW_MS) * WINDOW_MS;
				gauzy.set(window, Math.min(600, (gauzy.get(window) ?? 0) + body.duration));
				if (run.isRunning) run.stoppedAt = new Date(GAUZY_NOW).toISOString();
				return { data: { running: run.isRunning } };
			});
		mockGauzyGet.mockReset().mockImplementation(readWindows);
	});

	afterEach(() => {
		tabs.forEach((tab) => tab.signOut());
		tabs.forEach((tab) => tab.cleanup());
		tabs = [];
	});

	it('writes an owed Keep once when two tabs open at the same moment', async () => {
		oweTheKeep();
		const first = openTab();
		const firstOwner = first.mountOwner();
		const second = openTab();
		const secondOwner = second.mountOwner();

		await first.waitFor(() => expect(firstOwner.result.current).toBe(true), WAIT);
		await second.waitFor(() => expect(secondOwner.result.current).toBe(true), WAIT);

		// 120 + 240 and 180: not 600 (capped) and 360
		expect(gauzy.get(WINDOW_0900)).toBe(360);
		expect(gauzy.get(WINDOW_0910)).toBe(180);
		expect(mockGauzyPost).toHaveBeenCalledTimes(2);
		expect(window.localStorage.getItem(OWED_KEY)).toBeNull();
		// Given back once written
		expect(window.localStorage.getItem(LEASE_KEY)).toBeNull();
	}, 30_000);

	it('lets a tab opened while another one writes the Keep the person just kept wait, then ask nothing', async () => {
		Object.assign(run, { isRunning: true });
		const tracking = { ...EMPLOYEE, isTrackingTime: true };
		const first = openTab();
		const firstOwner = first.mountOwner(tracking);
		await first.waitFor(() => expect(first.question()).not.toBeNull(), WAIT);
		// The first slot's window read is slow: the Keep is recorded, and nothing of it written yet
		const answerWindowRead = holdNextWindowRead();
		await first.answer('keep');
		await first.waitFor(() => expect(window.localStorage.getItem(OWED_KEY)).not.toBeNull());

		// Another tab opens now, and finds the Keep owed
		const second = openTab();
		const secondOwner = second.mountOwner(tracking);
		await aMoment();
		expect(mockGauzyPost).not.toHaveBeenCalled();
		expect(second.question()).toBeNull();

		answerWindowRead();
		await first.waitFor(() => expect(firstOwner.result.current).toBe(true), WAIT);
		await second.waitFor(() => expect(secondOwner.result.current).toBe(true), WAIT);

		expect(gauzy.get(WINDOW_0900)).toBe(360);
		expect(gauzy.get(WINDOW_0910)).toBe(180);
		expect(mockGauzyPost).toHaveBeenCalledTimes(2);
		// The run reads as followed once the Keep is written: the other tab has nothing to ask
		expect(second.question()).toBeNull();
		expect(window.localStorage.getItem(OWED_KEY)).toBeNull();
	}, 30_000);

	it('stops writing in a tab whose lease another tab took meanwhile, which writes the Keep once from what is recorded', async () => {
		oweTheKeep();
		const answerWindowRead = holdNextWindowRead();
		const first = openTab();
		first.mountOwner();
		await first.waitFor(() => expect(mockGauzyGet).toHaveBeenCalledTimes(1));

		// The page was frozen past its lease, and another tab took it over: the first write would land beside its own
		window.localStorage.setItem(LEASE_KEY, JSON.stringify({ tab: 'another-tab', until: Date.now() + 30_000 }));
		answerWindowRead();
		await aMoment();
		expect(mockGauzyPost).not.toHaveBeenCalled();
		// Owed as it was, without a slot sent from here
		expect(JSON.parse(String(window.localStorage.getItem(OWED_KEY)))).toEqual(
			expect.objectContaining({ fromMs: HEARTBEAT })
		);
		expect(JSON.parse(String(window.localStorage.getItem(OWED_KEY))).unanswered).toBeUndefined();

		// That tab gives the lease back after it is gone; the next tab writes the Keep, once
		window.localStorage.removeItem(LEASE_KEY);
		const second = openTab();
		const secondOwner = second.mountOwner();
		await second.waitFor(() => expect(secondOwner.result.current).toBe(true), WAIT);
		expect(gauzy.get(WINDOW_0900)).toBe(360);
		expect(gauzy.get(WINDOW_0910)).toBe(180);
		expect(mockGauzyPost).toHaveBeenCalledTimes(2);
	}, 30_000);
});
