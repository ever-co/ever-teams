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

import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { activeTeamIdState, timerStartsInFlightState } from '@/core/stores';
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
	return { ...renderHook(() => useTimerBreak(timerStatus, stopWork), { wrapper }), store, queryClient };
}

/** Gauzy's refusal as Axios reports it, read by the API error service as the app's requests are. */
function gauzyRefusalOf(status: number, message: string) {
	return ApiErrorService.fromAxiosError({
		message: `Request failed with status code ${status}`,
		code: 'ERR_BAD_REQUEST',
		status,
		response: { data: { statusCode: status, message }, headers: {}, status, statusText: '' }
	});
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

const breakRunning = {
	running: false,
	lastLog: {
		id: 'break-1',
		logType: ETimeLogType.BREAK,
		isRunning: true,
		taskId: 'task-1',
		source: ETimeLogSource.TEAMS,
		startedAt: '2026-11-14T12:00:00.000Z'
	}
} as unknown as ITimerStatus;

/** Two tabs: this one still shows the break, while the other may have gone back to work meanwhile. */
describe('End break', () => {
	it('ends the break that still runs', async () => {
		mockGetTimerStatus.mockResolvedValue({ data: breakRunning });
		mockStopTimer.mockResolvedValue({ data: { running: false, lastLog: null } });
		const { result } = renderBreak(
			breakRunning,
			jest.fn(async () => undefined)
		);

		await act(async () => {
			await result.current.endBreak();
		});

		// Named, so a stop reaching Gauzy after another tab went back to work ends nothing (409)
		expect(mockStopTimer).toHaveBeenCalledWith({ source: ETimeLogSource.TEAMS, timeLogId: 'break-1' });
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it("takes Gauzy's 409 as a changed run: nothing stopped, no error, and the display is read again", async () => {
		mockGetTimerStatus.mockResolvedValue({ data: breakRunning });
		// Another tab went back to work between the status read and the stop
		mockStopTimer.mockRejectedValue(gauzyRefusalOf(409, 'This stop names a time log that is not the running one.'));
		const { result, queryClient } = renderBreak(
			breakRunning,
			jest.fn(async () => undefined)
		);
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

		await act(async () => {
			await result.current.endBreak();
		});

		expect(mockToastError).not.toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });
		expect(result.current.pendingAction).toBeNull();
	});

	it('stops nothing for a break shown without its id, which it could not tell from another', async () => {
		const breakWithoutId = { ...breakRunning, lastLog: { ...breakRunning.lastLog, id: undefined } } as ITimerStatus;
		mockGetTimerStatus.mockResolvedValue({ data: breakRunning });
		const { result } = renderBreak(
			breakWithoutId,
			jest.fn(async () => undefined)
		);

		await act(async () => {
			await result.current.endBreak();
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
	});

	it('stops nothing when the fresh status shows another break than the one on screen', async () => {
		const otherBreak = { ...breakRunning, lastLog: { ...breakRunning.lastLog, id: 'break-2' } } as ITimerStatus;
		mockGetTimerStatus.mockResolvedValue({ data: otherBreak });
		const { result } = renderBreak(
			breakRunning,
			jest.fn(async () => undefined)
		);

		await act(async () => {
			await result.current.endBreak();
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('never stops the work another tab started since this tab read its status', async () => {
		mockGetTimerStatus.mockResolvedValue({ data: workRunning });
		const { result } = renderBreak(
			breakRunning,
			jest.fn(async () => undefined)
		);

		await act(async () => {
			await result.current.endBreak();
		});

		expect(mockStopTimer).not.toHaveBeenCalled();
		expect(mockToastError).not.toHaveBeenCalled();
		expect(result.current.pendingAction).toBeNull();
	});
});

/**
 * The organization switch waits for the timer's requests (#5204, #5263): the timer shows stopped while a break starts
 * or ends, and a switch then would leave the break running, or not ended, in the organization left behind.
 */
describe('A break in the organization switch guard', () => {
	it('counts a break start until its request settles', async () => {
		let landBreak = () => {};
		mockStartBreak.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					landBreak = resolve;
				})
		);
		const { result, store } = renderBreak(
			workRunning,
			jest.fn(async () => undefined)
		);

		let taking: Promise<void> = Promise.resolve();
		act(() => {
			taking = result.current.takeBreak();
		});
		await waitFor(() => expect(mockStartBreak).toHaveBeenCalledTimes(1));
		expect(store.get(timerStartsInFlightState)).toBe(1);

		await act(async () => {
			landBreak();
			await taking;
		});

		expect(store.get(timerStartsInFlightState)).toBe(0);
	});

	it('counts a break end until its stop settles, a refused one too', async () => {
		mockGetTimerStatus.mockResolvedValue({ data: breakRunning });
		let refuseStop: (error: unknown) => void = () => {};
		mockStopTimer.mockImplementation(
			() =>
				new Promise((_resolve, reject) => {
					refuseStop = reject;
				})
		);
		const { result, store } = renderBreak(
			breakRunning,
			jest.fn(async () => undefined)
		);

		let ending: Promise<void> = Promise.resolve();
		act(() => {
			ending = result.current.endBreak();
		});
		await waitFor(() => expect(mockStopTimer).toHaveBeenCalledTimes(1));
		expect(store.get(timerStartsInFlightState)).toBe(1);

		await act(async () => {
			refuseStop(gauzyRefusalOf(500, 'Internal server error'));
			await ending;
		});

		expect(store.get(timerStartsInFlightState)).toBe(0);
		expect(mockToastError).toHaveBeenCalledTimes(1);
	});
});
