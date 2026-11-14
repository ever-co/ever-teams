/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { PropsWithChildren } from 'react';

import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { timerStatusState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

const mockDiscardTimer = jest.fn();
const mockToastSuccess = jest.fn();
const mockReadOrganization = jest.fn();
const mockTrackTimerCommand = jest.fn();

jest.mock('@/core/services/client/api/timers/timer.service', () => ({
	timerService: { discardTimer: (...args: unknown[]) => mockDiscardTimer(...args) }
}));
jest.mock('@/core/hooks/timer/use-timer-api', () => ({
	trackTimerCommand: (request: Promise<unknown>) => mockTrackTimerCommand(request)
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: (...args: unknown[]) => mockReadOrganization(...args)
}));
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { useTimerDiscard } from './use-timer-discard';

const START = Date.parse('2026-11-14T10:00:00.000Z');
const RUNNING = { running: true, duration: 0, lastLog: { id: 'log-1', startedAt: new Date(START), source: 'TEAMS' } };
const STOPPED = { running: false, duration: 3600, lastLog: { id: 'log-0' } };

function refusal(status: number, code?: string) {
	return ApiErrorService.fromAxiosError({
		message: `Request failed with status code ${status}`,
		status,
		response: { status, data: { message: 'refused', ...(code ? { code } : {}) } }
	});
}

function renderDiscard(organization: Record<string, unknown> | null) {
	const store = createStore();
	store.set(timerStatusState, RUNNING as never);
	store.set(currentOrganizationState, organization as never);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const invalidate = jest.spyOn(client, 'invalidateQueries');
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const rendered = renderHook(() => useTimerDiscard(), { wrapper });
	return { ...rendered, store, invalidate };
}

beforeEach(() => {
	jest.useFakeTimers({ now: START + 60_000, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
	mockDiscardTimer.mockReset();
	mockToastSuccess.mockReset();
	mockReadOrganization.mockReset();
	mockReadOrganization.mockReturnValue({ isError: false, refetch: jest.fn() });
	mockTrackTimerCommand.mockReset();
	mockTrackTimerCommand.mockImplementation((request: Promise<unknown>) => request);
});

afterEach(() => {
	jest.useRealTimers();
});

describe('useTimerDiscard', () => {
	it('reads the organization itself while a run is going, since the home page does not', () => {
		renderDiscard(null);

		expect(mockReadOrganization).toHaveBeenCalledWith({ enabled: true });
	});

	it('offers no discard against an API without it', () => {
		const { result } = renderDiscard({ id: 'organization-1' });

		expect(result.current.availability).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
	});

	it('discards the run the member sees, then shows the stopped status the API answers', async () => {
		mockDiscardTimer.mockResolvedValue({ data: STOPPED });
		const { result, store, invalidate } = renderDiscard({ id: 'organization-1', allowDiscardTimer: null });

		expect(result.current.availability).toEqual({ available: true, closesAt: null });
		expect(result.current.runningLogId).toBe('log-1');
		let discarded = false;
		await act(async () => {
			discarded = await result.current.discard('log-1');
		});

		expect(discarded).toBe(true);
		expect(mockDiscardTimer).toHaveBeenCalledWith({ timeLogId: 'log-1' });
		expect(store.get(timerStatusState)).toEqual(STOPPED);
		expect(result.current.failure).toBeNull();
		expect(mockToastSuccess).toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalled();
	});

	it("keeps the API's reason when it refuses, and the timer as it was", async () => {
		mockDiscardTimer.mockRejectedValue(refusal(403, 'TIMER_DISCARD_TOO_LATE'));
		const { result, store } = renderDiscard({ id: 'organization-1', allowDiscardTimer: true });

		let discarded = true;
		await act(async () => {
			discarded = await result.current.discard('log-1');
		});

		expect(discarded).toBe(false);
		expect(result.current.failure).toBe('TOO_LATE');
		expect(store.get(timerStatusState)).toEqual(RUNNING);
	});

	it('sends the discard as a timer command, so a status read sent before it cannot show the run again', async () => {
		mockDiscardTimer.mockResolvedValue({ data: STOPPED });
		const { result } = renderDiscard({ id: 'organization-1', allowDiscardTimer: null });

		await act(async () => {
			await result.current.discard('log-1');
		});

		expect(mockTrackTimerCommand).toHaveBeenCalledTimes(1);
		expect(mockTrackTimerCommand).toHaveBeenCalledWith(mockDiscardTimer.mock.results[0].value);
	});

	it('counts a discard whose status read failed as done: the timer reads stopped and the views read again', async () => {
		mockDiscardTimer.mockResolvedValue({ data: null });
		const { result, store, invalidate } = renderDiscard({ id: 'organization-1', allowDiscardTimer: null });

		let discarded = false;
		await act(async () => {
			discarded = await result.current.discard('log-1');
		});

		expect(discarded).toBe(true);
		expect(result.current.failure).toBeNull();
		expect(store.get(timerStatusState)?.running).toBe(false);
		expect(mockToastSuccess).toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.timer.all });
	});

	it('takes the offer away once the run is older than the organization allows', async () => {
		const { result } = renderDiscard({
			id: 'organization-1',
			allowDiscardTimer: true,
			discardTimerWithinMinutes: 2
		});

		expect(result.current.availability).toEqual({ available: true, closesAt: START + 120_000 });
		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		await waitFor(() => expect(result.current.availability).toEqual({ available: false, reason: 'TOO_LATE' }));
	});
});
