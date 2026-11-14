/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { localTimerStatusState, timerStatusState } from '@/core/stores/timer/timer';

import { useTimerStorage } from './use-timer-storage';

const CREATED_AT = '2026-11-16T09:25:00.000Z';

function runningStatus(startedAt: string) {
	return { running: true, duration: 0, lastLog: { id: 'log-1', createdAt: CREATED_AT, startedAt, duration: 0 } };
}

function setup(startedAt: string) {
	const store = createStore();
	store.set(timerStatusState, runningStatus(startedAt) as never);
	const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
	renderHook(() => useTimerStorage({ firstLoad: true, activeTeamId: 'team-1' }), { wrapper });
	return store;
}

afterEach(() => {
	window.localStorage.clear();
});

describe('useTimerStorage', () => {
	it('counts the running clock from the start of the run', () => {
		const store = setup('2026-11-16T09:25:00.000Z');

		expect(store.get(localTimerStatusState)?.runnedDateTime).toBe(Date.parse('2026-11-16T09:25:00.000Z'));
	});

	it('follows a start moved while the timer runs, which the log keeps beside the time it was created', () => {
		const store = setup('2026-11-16T09:25:00.000Z');

		act(() => {
			store.set(timerStatusState, runningStatus('2026-11-16T09:00:00.000Z') as never);
		});

		expect(store.get(localTimerStatusState)?.runnedDateTime).toBe(Date.parse('2026-11-16T09:00:00.000Z'));
	});
});
