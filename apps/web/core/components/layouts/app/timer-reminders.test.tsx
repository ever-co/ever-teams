/** @jest-environment jsdom */
/**
 * #5022: the reminders follow the app's timer, or the run its owner found past midnight (a Gauzy whose day status
 * sees only the day's logs), which they stop themselves since the owner's stop sees no timer running.
 */
import { act, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { ReactNode } from 'react';

const mockReminders = jest.fn();
const mockStopTimer = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/core/hooks/notifications/use-timer-reminders', () => ({
	useTimerReminders: (input: unknown) => mockReminders(input)
}));
jest.mock('@/core/services/client/api/timers/timer.service', () => ({
	timerService: { stopTimer: (...args: unknown[]) => mockStopTimer(...args), getLastTimerLog: jest.fn() }
}));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerStatusState } from '@/core/stores/timer/timer';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { TimerReminders } from './timer-reminders';

const EMPLOYEE_ID = 'employee-1';
const DAY_STATUS: ITimerStatus = { running: false, lastLog: null } as never;
const YESTERDAYS_LOG = {
	id: 'log-1',
	startedAt: '2026-11-10T20:00:00.000Z',
	isRunning: true,
	source: ETimeLogSource.TEAMS
};

interface ReminderInput {
	timerStatus: ITimerStatus | null;
	stopTimer: () => unknown;
}

const lastInput = () => mockReminders.mock.calls.at(-1)?.[0] as ReminderInput;

/** Gauzy's answer to a stop, as the API client reports it. */
const responseError = (status: number) =>
	ApiErrorService.fromAxiosError({
		message: 'Request failed',
		response: { data: {}, headers: {}, status, statusText: 'Error' }
	});

function renderReminders({ runsPastMidnight }: { runsPastMidnight: boolean }) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	queryClient.setQueryData(queryKeys.timer.lastLog(EMPLOYEE_ID), YESTERDAYS_LOG);
	const store = createStore();
	store.set(timerStatusState, DAY_STATUS);
	const ownerStop = jest.fn();
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	render(<TimerReminders stopTimer={ownerStop} employeeId={EMPLOYEE_ID} runsPastMidnight={runsPastMidnight} />, {
		wrapper
	});
	return { queryClient, ownerStop };
}

describe('TimerReminders', () => {
	beforeEach(() => {
		mockReminders.mockReset();
		mockStopTimer.mockReset().mockResolvedValue({ data: { running: false } });
		mockToastError.mockReset();
	});

	it("follows the day's status and the owner's stop while the timer does not run past midnight", () => {
		const { ownerStop } = renderReminders({ runsPastMidnight: false });

		expect(lastInput().timerStatus).toEqual(DAY_STATUS);
		expect(lastInput().stopTimer).toBe(ownerStop);
	});

	it('reminds of the run found past midnight, and stops that run itself', async () => {
		const { queryClient, ownerStop } = renderReminders({ runsPastMidnight: true });
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

		expect(lastInput().timerStatus).toMatchObject({ running: true, lastLog: YESTERDAYS_LOG });

		await act(async () => {
			await lastInput().stopTimer();
		});
		expect(mockStopTimer).toHaveBeenCalledWith({ source: ETimeLogSource.TEAMS });
		expect(ownerStop).not.toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });
		expect(mockToastError).not.toHaveBeenCalled();
	});

	it('says so when that stop fails, and nothing when another tab or device stopped the run first', async () => {
		renderReminders({ runsPastMidnight: true });

		mockStopTimer.mockRejectedValueOnce(responseError(406));
		await act(async () => {
			await lastInput().stopTimer();
		});
		expect(mockToastError).not.toHaveBeenCalled();

		mockStopTimer.mockRejectedValueOnce(responseError(500));
		await act(async () => {
			await lastInput().stopTimer();
		});
		expect(mockToastError).toHaveBeenCalledWith(
			'toasts.timer.STOP_FAILED',
			expect.objectContaining({ id: 'timer-stop-failed' })
		);
	});
});
