/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { endOfDay } from 'date-fns';

const mockGetPeriodHistory = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log-history.service', () => ({
	timeLogHistoryService: { getPeriodHistory: (...args: unknown[]) => mockGetPeriodHistory(...args) }
}));

import { type PeriodHistoryRequest, useTimeLogPeriodHistory } from './use-time-log-period-history';

/** A week that ended before "today": its history is read up to the end of the current day. */
const request: PeriodHistoryRequest = {
	tenantId: 'tenant',
	organizationId: 'organization',
	employeeIds: ['employee-a'],
	from: new Date(2026, 10, 2),
	to: endOfDay(new Date(2026, 10, 8))
};

const MONDAY_EVENING = new Date(2026, 10, 9, 23, 50);
const TUESDAY_MORNING = new Date(2026, 10, 10, 0, 10);

function wrapperOf(client: QueryClient) {
	return function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	};
}

function cutoffOfCall(index: number): Date {
	const range = mockGetPeriodHistory.mock.calls[index][0] as { to: Date };
	return range.to;
}

describe('the period history read', () => {
	beforeEach(() => {
		jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
		jest.setSystemTime(MONDAY_EVENING);
		mockGetPeriodHistory.mockReset();
		mockGetPeriodHistory.mockResolvedValue({ kind: 'ready', value: [] });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('reads up to the end of the current day', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useTimeLogPeriodHistory(request, true), { wrapper: wrapperOf(client) });

		await waitFor(() => expect(result.current.status).toBe('ready'));

		expect(cutoffOfCall(0)).toEqual(endOfDay(MONDAY_EVENING));
	});

	it('reads up to the new day when it reads again after midnight, with no render in between', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useTimeLogPeriodHistory(request, true), { wrapper: wrapperOf(client) });
		await waitFor(() => expect(result.current.status).toBe('ready'));

		jest.setSystemTime(TUESDAY_MORNING);
		await act(async () => {
			result.current.refetch();
		});
		await waitFor(() => expect(mockGetPeriodHistory).toHaveBeenCalledTimes(2));

		expect(cutoffOfCall(1)).toEqual(endOfDay(TUESDAY_MORNING));
	});
});
