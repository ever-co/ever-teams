/** @jest-environment jsdom */

/**
 * Breaks from the timer (#5216). Taking one stops the work, then starts the break: Gauzy's start ends whatever runs,
 * so a work start landing between the two would be ended by the break, or end it. The whole action holds the start
 * guard every timer shares, which the other timer, the task cards and the start key respect.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { activeTeamIdState } from '@/core/stores';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { pendingTimerStart, startUnderTimerGuard } from './use-timer-api';
import { useTimerBreak } from './use-timer-break';

const mockStartBreak = jest.fn();
const mockStopTimer = jest.fn();
const mockGetTimerStatus = jest.fn();
const mockToastWarning = jest.fn();
const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('sonner', () => ({
	toast: {
		warning: (...args: unknown[]) => mockToastWarning(...args),
		error: (...args: unknown[]) => mockToastError(...args),
		info: jest.fn()
	}
}));
jest.mock('@/core/hooks/timer/use-breaks-allowed', () => ({ useBreaksAllowed: () => true }));
jest.mock('@/core/services/client/api/timers/timer.service', () => ({
	timerService: {
		startBreak: (...args: unknown[]) => mockStartBreak(...args),
		stopTimer: (...args: unknown[]) => mockStopTimer(...args),
		getTimerStatus: (...args: unknown[]) => mockGetTimerStatus(...args)
	}
}));

const workRunning = {
	running: true,
	lastLog: {
		id: 'work-1',
		logType: ETimeLogType.TRACKED,
		isRunning: true,
		taskId: 'task-1',
		source: ETimeLogSource.TEAMS,
		startedAt: '2026-11-14T09:00:00.000Z'
	}
} as unknown as ITimerStatus;

function renderBreak(timerStatus: ITimerStatus, stopWork: () => Promise<unknown>) {
	const store = createStore();
	store.set(activeTeamIdState, 'team-1');
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return renderHook(() => useTimerBreak(timerStatus, stopWork), { wrapper });
}

describe('Take a break', () => {
	it('holds the shared start guard from the stop of the work until the break has started', async () => {
		let landBreak = () => {};
		mockStartBreak.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					landBreak = resolve;
				})
		);
		const stopWork = jest.fn(async () => undefined);
		const { result } = renderBreak(workRunning, stopWork);

		let taking: Promise<void> = Promise.resolve();
		act(() => {
			taking = result.current.takeBreak();
		});
		// Already while the work stops
		expect(pendingTimerStart()).not.toBeNull();
		await waitFor(() => expect(mockStartBreak).toHaveBeenCalledTimes(1));
		expect(stopWork).toHaveBeenCalledTimes(1);
		expect(mockStartBreak).toHaveBeenCalledWith({ taskId: 'task-1', organizationTeamId: 'team-1' });
		// And while the break's start is on its way
		expect(pendingTimerStart()).not.toBeNull();

		await act(async () => {
			landBreak();
			await taking;
		});

		expect(pendingTimerStart()).toBeNull();
		expect(result.current.pendingAction).toBeNull();
	});

	it('stops nothing and starts no break while another start is on its way', async () => {
		let landStart = () => {};
		const start = startUnderTimerGuard(
			() =>
				new Promise<void>((resolve) => {
					landStart = resolve;
				})
		);
		const stopWork = jest.fn(async () => undefined);
		const { result } = renderBreak(workRunning, stopWork);

		await act(async () => {
			await result.current.takeBreak();
		});

		expect(stopWork).not.toHaveBeenCalled();
		expect(mockStartBreak).not.toHaveBeenCalled();
		expect(mockToastWarning).toHaveBeenCalledWith('toasts.timer.START_IN_PROGRESS', {
			id: 'timer-start-in-progress'
		});

		landStart();
		await start;
	});
});
