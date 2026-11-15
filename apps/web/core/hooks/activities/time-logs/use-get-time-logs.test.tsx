/**
 * @jest-environment jsdom
 *
 * The plan header's Worked figure reads the logs of the plan's tasks: a task added to or removed from the plan changes
 * the parameters, and the last total must stay on screen while the new one is read, instead of a loading bar.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useGetTimeLogs } from './use-get-time-logs';

const mockGetTimeLogs = jest.fn();

jest.mock('@/core/services/client/api', () => ({
	timeLogService: { getTimeLogs: (...args: unknown[]) => mockGetTimeLogs(...args) }
}));

const day = '2026-11-15T00:00:00.000Z';
const firstLogs = [{ id: 'log-1', duration: 600 }];

function renderTimeLogs(keepsPreviousData: boolean) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(
		({ taskIds }: { taskIds: string[] }) =>
			useGetTimeLogs({ startDate: day, endDate: day, taskIds }, { keepsPreviousData }),
		{ wrapper, initialProps: { taskIds: ['task-1'] } }
	);
}

describe('useGetTimeLogs', () => {
	beforeEach(() => {
		mockGetTimeLogs.mockReset();
		mockGetTimeLogs.mockResolvedValueOnce(firstLogs);
		// The read for the new parameters stays pending, as on a slow network
		mockGetTimeLogs.mockReturnValueOnce(new Promise(() => undefined));
	});

	it('keeps the last logs while the logs of new parameters are read', async () => {
		const { result, rerender } = renderTimeLogs(true);
		await waitFor(() => expect(result.current.data).toEqual(firstLogs));

		rerender({ taskIds: ['task-1', 'task-2'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.isLoading).toBe(false);
		expect(result.current.data).toEqual(firstLogs);
	});

	it('still starts empty for other readers that do not ask to keep them', async () => {
		const { result, rerender } = renderTimeLogs(false);
		await waitFor(() => expect(result.current.data).toEqual(firstLogs));

		rerender({ taskIds: ['task-1', 'task-2'] });

		await waitFor(() => expect(mockGetTimeLogs).toHaveBeenCalledTimes(2));
		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeUndefined();
	});
});
