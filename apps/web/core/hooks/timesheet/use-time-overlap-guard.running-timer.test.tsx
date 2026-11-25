/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

const mockGetTimeLogConflicts = jest.fn();

jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: { getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params) }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));

import { useTimeOverlapGuard } from './use-time-overlap-guard';

// The timer started an hour ago and still runs; the member adds twenty minutes inside that hour
const HOUR_MS = 60 * 60 * 1000;
const timerStart = new Date(Date.now() - HOUR_MS);
const addedPeriod = { start: new Date(Date.now() - 40 * 60 * 1000), end: new Date(Date.now() - 20 * 60 * 1000) };
const runningTimer = { id: 'running', startedAt: timerStart.toISOString(), stoppedAt: null, isRunning: true };
const stoppedEntry = {
	id: 'stopped',
	startedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
	stoppedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
	isRunning: false
};

function renderGuard() {
	const client = new QueryClient();
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook((props: { isOpen: boolean }) => useTimeOverlapGuard(props), {
		wrapper,
		initialProps: { isOpen: true }
	});
}

/**
 * Add time over one's own running timer (#5724): the dialog offered "Add time anyway", and the API then refused the
 * save, as it always does over a running timer. The person is told before, and nothing is offered to press.
 */
describe('useTimeOverlapGuard over a running timer', () => {
	it('neither saves nor offers to save a range the running timer covers', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([runningTimer]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save }));

		expect(save).not.toHaveBeenCalled();
		expect(result.current.isConfirmOpen).toBe(false);
		expect(result.current.isOverRunningTimer).toBe(true);
		expect(result.current.hasCheckFailed).toBe(false);
	});

	it('refuses too when the range covers a stopped entry beside the running timer', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([stoppedEntry, runningTimer]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save }));

		expect(save).not.toHaveBeenCalled();
		expect(result.current.isConfirmOpen).toBe(false);
		expect(result.current.isOverRunningTimer).toBe(true);
	});

	it('still asks before removing a stopped entry, as before', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([stoppedEntry]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save }));

		expect(result.current.isConfirmOpen).toBe(true);
		expect(result.current.isOverRunningTimer).toBe(false);
	});

	it('drops the refusal at the next try, once the timer is stopped', async () => {
		mockGetTimeLogConflicts.mockResolvedValueOnce([runningTimer]);
		mockGetTimeLogConflicts.mockResolvedValueOnce([]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save }));
		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save }));

		expect(save).toHaveBeenCalledTimes(1);
		expect(result.current.isOverRunningTimer).toBe(false);
	});

	it('drops the refusal when the dialog closes', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([runningTimer]);
		const { result, rerender } = renderGuard();

		await act(() =>
			result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [addedPeriod], save: jest.fn() })
		);
		rerender({ isOpen: false });

		expect(result.current.isOverRunningTimer).toBe(false);
	});
});
