import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import { readEmployeeId, readTimerStatus, readTrackedTotals, stopTimer } from '../data/timer';
import { sessionAtom } from '../state/session';
import type { SessionState } from '../state/session';
import { useStopTimer, useTimerStatus, useTrackedTotals } from './use-home-timer';

jest.mock('../data/timer', () => ({
	readTimerStatus: jest.fn(),
	readTrackedTotals: jest.fn(),
	readEmployeeId: jest.fn(),
	readTask: jest.fn(),
	startTimer: jest.fn(),
	stopTimer: jest.fn()
}));

const kofi = { accessToken: 'access', tenantId: 'tenant', organizationId: 'organization' };

function wrapperFor(state: SessionState) {
	const store = createStore();
	store.set(sessionAtom, state);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<Provider store={store}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</Provider>
		);
	}
	return Wrapper;
}

beforeEach(() => {
	jest.clearAllMocks();
	(readTimerStatus as jest.Mock).mockResolvedValue({ duration: 6740, running: false });
	(readEmployeeId as jest.Mock).mockResolvedValue('employee-kofi');
	(readTrackedTotals as jest.Mock).mockResolvedValue({ weekDuration: 25763, todayDuration: 6758 });
	(stopTimer as jest.Mock).mockResolvedValue(undefined);
});

describe('Home reads', () => {
	it('the timer of the person signed in', async () => {
		const { result } = await renderHook(() => useTimerStatus(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await waitFor(() => expect(result.current.data).toEqual({ duration: 6740, running: false }));
		expect(readTimerStatus).toHaveBeenCalledWith(kofi, expect.any(Date));
	});

	it('nothing while nobody is signed in', async () => {
		await renderHook(() => useTimerStatus(), { wrapper: wrapperFor({ status: 'signed-out' }) });

		expect(readTimerStatus).not.toHaveBeenCalled();
	});

	it('the totals of the employee the person is', async () => {
		const { result } = await renderHook(() => useTrackedTotals(), {
			wrapper: wrapperFor({ status: 'signed-in', session: kofi })
		});

		await waitFor(() => expect(result.current.data).toEqual({ weekDuration: 25763, todayDuration: 6758 }));
		expect(readTrackedTotals).toHaveBeenCalledWith(kofi, 'employee-kofi', expect.any(Date));
	});
});

describe('a stop from Home', () => {
	it('names the running log, then reads the timer and the totals again', async () => {
		const wrapper = wrapperFor({ status: 'signed-in', session: kofi });
		const status = await renderHook(() => useTimerStatus(), { wrapper });
		await waitFor(() => expect(status.result.current.isSuccess).toBe(true));
		const stop = await renderHook(() => useStopTimer(), { wrapper });
		const running = { startedAt: '2026-11-18T08:00:00.000Z', taskId: 'task-har-3' };

		await act(async () => {
			await stop.result.current.mutateAsync(running);
		});

		expect(stopTimer).toHaveBeenCalledWith(kofi, running);
		await waitFor(() => expect(readTimerStatus).toHaveBeenCalledTimes(2));
	});
});
