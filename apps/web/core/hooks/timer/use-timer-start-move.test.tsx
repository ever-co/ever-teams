/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { timerStatusState } from '@/core/stores/timer/timer';

const mockMoveTimerStart = jest.fn();
const mockGetTimerStartMoveSupport = jest.fn();

jest.mock('@/core/services/client/api/timers/timer.service', () => ({
	timerService: {
		moveTimerStart: (...args: unknown[]) => mockMoveTimerStart(...args),
		getTimerStartMoveSupport: (...args: unknown[]) => mockGetTimerStartMoveSupport(...args)
	}
}));

import { useMoveTimerStart, useTimerStartMoveSupport } from './use-timer-start-move';

function setup() {
	const store = createStore();
	store.set(timerStatusState, { running: true, duration: 600, lastLog: { id: 'log-1' } } as never);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	return { store, client, wrapper };
}

afterEach(() => {
	jest.clearAllMocks();
});

describe('useTimerStartMoveSupport', () => {
	it('asks the API nothing until the panel opens', () => {
		const { wrapper } = setup();

		const { result } = renderHook(() => useTimerStartMoveSupport(false), { wrapper });

		expect(result.current).toBe('checking');
		expect(mockGetTimerStartMoveSupport).not.toHaveBeenCalled();
	});

	it('checks the API once, then remembers what it said', async () => {
		mockGetTimerStartMoveSupport.mockResolvedValue('unsupported');
		const { wrapper } = setup();

		const { result, rerender } = renderHook(({ open }) => useTimerStartMoveSupport(open), {
			wrapper,
			initialProps: { open: true }
		});

		await waitFor(() => expect(result.current).toBe('unsupported'));
		rerender({ open: false });
		rerender({ open: true });
		expect(mockGetTimerStartMoveSupport).toHaveBeenCalledTimes(1);
	});
});

describe('useMoveTimerStart', () => {
	it('shows the status the API answers after the move, so the clock jumps at once', async () => {
		const movedStatus = { running: true, duration: 2100, lastLog: { id: 'log-1' } };
		mockMoveTimerStart.mockResolvedValue({ data: movedStatus });
		const { store, wrapper } = setup();

		const { result } = renderHook(() => useMoveTimerStart(), { wrapper });
		await act(async () => {
			await result.current.moveStart({ startedAt: new Date(2026, 10, 16, 9, 0), reason: 'Forgot' });
		});

		expect(mockMoveTimerStart).toHaveBeenCalledWith({
			startedAt: new Date(2026, 10, 16, 9, 0),
			reason: 'Forgot'
		});
		expect(store.get(timerStatusState)).toEqual(movedStatus);
	});

	it('remembers a missing route, so the panel shows the start alone from then on', async () => {
		mockMoveTimerStart.mockRejectedValue({ statusCode: 404 });
		const { client, wrapper } = setup();

		const { result } = renderHook(() => ({ move: useMoveTimerStart(), support: useTimerStartMoveSupport(false) }), {
			wrapper
		});
		await act(async () => {
			await result.current.move.moveStart({ startedAt: new Date(2026, 10, 16, 9, 0) }).catch(() => undefined);
		});

		await waitFor(() => expect(result.current.support).toBe('unsupported'));
		expect(client.getQueryData(['timer-start-move-support'])).toBe('unsupported');
	});

	it('keeps the status the timer showed when the API refuses the move', async () => {
		const refusal = { statusCode: 409, errorCode: 'TIMER_START_OVERLAP' };
		mockMoveTimerStart.mockRejectedValue(refusal);
		const { store, wrapper } = setup();
		const before = store.get(timerStatusState);

		const { result } = renderHook(() => useMoveTimerStart(), { wrapper });
		let caught: unknown;
		await act(async () => {
			await result.current.moveStart({ startedAt: new Date(2026, 10, 16, 9, 0) }).catch((error) => {
				caught = error;
			});
		});

		expect(caught).toBe(refusal);
		expect(store.get(timerStatusState)).toBe(before);
	});
});
