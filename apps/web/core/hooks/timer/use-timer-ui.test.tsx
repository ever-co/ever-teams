/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { localTimerStatusState, timerSecondsState, timerStatusReceiptState, timerStatusState } from '@/core/stores';
import type { ILocalTimerStatus, ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

import { useLiveTimerStatus, useTimerUi } from './use-timer-ui';

type TimerStore = ReturnType<typeof createStore>;

const LOAD_TIME = Date.parse('2026-10-25T10:00:00.000Z');

function createWrapper(store: TimerStore) {
	return function TimerStoreProvider({ children }: PropsWithChildren) {
		return <Provider store={store}>{children}</Provider>;
	};
}

function setLocalTimerRunning(store: TimerStore, startedAt: number) {
	const localStatus: ILocalTimerStatus = { lastTaskId: 'task-1', runnedDateTime: startedAt, running: true };
	store.set(localTimerStatusState, localStatus);
}

function setLocalTimerStopped(store: TimerStore) {
	const localStatus: ILocalTimerStatus = { lastTaskId: 'task-1', runnedDateTime: 0, running: false };
	store.set(localTimerStatusState, localStatus);
}

// The shell's single useTimerUi, as InitState mounts it, next to a reader of the live total like the profile Worked tab
function renderShellAndLiveTotal(store: TimerStore) {
	const wrapper = createWrapper(store);
	renderHook(() => useTimerUi({ firstLoad: true, activeTeamTask: null }), { wrapper });
	return renderHook(() => useLiveTimerStatus(), { wrapper });
}

function advanceSeconds(seconds: number) {
	const elapsedMs = seconds * 1000;
	act(() => {
		jest.advanceTimersByTime(elapsedMs);
	});
}

function receiveStatus(store: TimerStore, status: ITimerStatus) {
	act(() => {
		store.set(timerStatusState, status);
	});
}

describe('useLiveTimerStatus total time', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(LOAD_TIME);
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it('counts a running session once after a reload', () => {
		// The timer started 10m30s before the reload and the status read on load already holds that running log
		const store = createStore();
		const sessionStartedAt = LOAD_TIME - 630_000;
		store.set(timerStatusState, { running: true, duration: 630 });
		setLocalTimerRunning(store, sessionStartedAt);
		const { result } = renderShellAndLiveTotal(store);

		advanceSeconds(1);
		expect(result.current.time).toEqual({ h: 0, m: 10 });

		advanceSeconds(60);
		expect(result.current.time).toEqual({ h: 0, m: 11 });
	});

	it('shows a newly received running status alone until the shell records its receipt', () => {
		// No shell here, so the receipt still belongs to the status read 5 minutes ago, which the new one includes
		const store = createStore();
		const previousStatus: ITimerStatus = { running: true, duration: 630 };
		const newStatus: ITimerStatus = { running: true, duration: 930 };
		const previousReceivedAt = LOAD_TIME - 300_000;
		const sessionStartedAt = LOAD_TIME - 930_000;
		store.set(timerStatusState, newStatus);
		store.set(timerStatusReceiptState, { status: previousStatus, receivedAt: previousReceivedAt });
		setLocalTimerRunning(store, sessionStartedAt);
		store.set(timerSecondsState, 930);
		const wrapper = createWrapper(store);

		const { result } = renderHook(() => useLiveTimerStatus(), { wrapper });

		expect(result.current.time).toEqual({ h: 0, m: 15 });
	});

	it('counts from the latest status after a refresh', () => {
		const store = createStore();
		const sessionStartedAt = LOAD_TIME - 630_000;
		store.set(timerStatusState, { running: true, duration: 630 });
		setLocalTimerRunning(store, sessionStartedAt);
		const { result } = renderShellAndLiveTotal(store);
		advanceSeconds(300);
		expect(result.current.time).toEqual({ h: 0, m: 15 });

		// The polled status holds the 5 minutes run since the first read
		receiveStatus(store, { running: true, duration: 930 });
		expect(result.current.time).toEqual({ h: 0, m: 15 });

		advanceSeconds(60);
		expect(result.current.time).toEqual({ h: 0, m: 16 });
	});

	it('adds the local seconds while the start request is in flight, then counts from the running status', () => {
		// 5 minutes were logged earlier today and the timer is stopped
		const store = createStore();
		store.set(timerStatusState, { running: false, duration: 300 });
		setLocalTimerStopped(store);
		const { result } = renderShellAndLiveTotal(store);
		expect(result.current.time).toEqual({ h: 0, m: 5 });

		// Start updates the local status at once and its status answer lands later
		act(() => {
			const clickedAt = Date.now();
			setLocalTimerRunning(store, clickedAt);
		});
		advanceSeconds(90);
		expect(result.current.time).toEqual({ h: 0, m: 6 });

		// The answer is a status read that holds the 90 seconds of the new running log
		receiveStatus(store, { running: true, duration: 390 });
		expect(result.current.time).toEqual({ h: 0, m: 6 });

		advanceSeconds(60);
		expect(result.current.time).toEqual({ h: 0, m: 7 });
	});

	it('shows the stopped duration alone once the timer stops', () => {
		const store = createStore();
		const sessionStartedAt = LOAD_TIME - 630_000;
		store.set(timerStatusState, { running: true, duration: 630 });
		setLocalTimerRunning(store, sessionStartedAt);
		const { result } = renderShellAndLiveTotal(store);
		advanceSeconds(60);

		// Stop updates the local status at once, the running status stays until the stop answer lands
		act(() => {
			setLocalTimerStopped(store);
		});
		expect(result.current.time).toEqual({ h: 0, m: 11 });

		receiveStatus(store, { running: false, duration: 690 });
		expect(result.current.time).toEqual({ h: 0, m: 11 });

		advanceSeconds(300);
		expect(result.current.time).toEqual({ h: 0, m: 11 });
	});

	it('keeps the receipt of an unchanged status when the shell mounts again', () => {
		// OfflineWrapper unmounts AppState while offline and mounts it again on reconnect, the store keeps the status
		const store = createStore();
		const sessionStartedAt = LOAD_TIME - 630_000;
		store.set(timerStatusState, { running: true, duration: 630 });
		setLocalTimerRunning(store, sessionStartedAt);
		const wrapper = createWrapper(store);
		const shell = renderHook(() => useTimerUi({ firstLoad: true, activeTeamTask: null }), { wrapper });
		const { result } = renderHook(() => useLiveTimerStatus(), { wrapper });
		advanceSeconds(300);
		expect(result.current.time).toEqual({ h: 0, m: 15 });

		shell.unmount();
		advanceSeconds(60);
		renderHook(() => useTimerUi({ firstLoad: true, activeTeamTask: null }), { wrapper });
		advanceSeconds(1);
		expect(result.current.time).toEqual({ h: 0, m: 16 });
	});

	it('follows the running log until a delayed stop answer lands', () => {
		// The stop sends no stoppedAt: Gauzy closes the log when it handles the request, so the log counts until then
		const store = createStore();
		const sessionStartedAt = LOAD_TIME - 630_000;
		store.set(timerStatusState, { running: true, duration: 630 });
		setLocalTimerRunning(store, sessionStartedAt);
		const { result, rerender } = renderShellAndLiveTotal(store);
		advanceSeconds(20);
		act(() => {
			setLocalTimerStopped(store);
		});
		expect(result.current.time).toEqual({ h: 0, m: 10 });

		// The answer takes 15 seconds and the reader renders again meanwhile
		advanceSeconds(15);
		rerender();
		expect(result.current.time).toEqual({ h: 0, m: 11 });

		// Gauzy handled the stop 13 seconds after the click
		receiveStatus(store, { running: false, duration: 663 });
		expect(result.current.time).toEqual({ h: 0, m: 11 });

		advanceSeconds(300);
		rerender();
		expect(result.current.time).toEqual({ h: 0, m: 11 });
	});
});
