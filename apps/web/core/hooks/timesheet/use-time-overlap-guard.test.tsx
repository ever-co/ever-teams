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

const at = (time: string) => new Date(`2026-11-10T${time}:00.000Z`);
const eveningPeriod = { start: at('18:30'), end: at('19:30') };
const morningPeriod = { start: at('09:00'), end: at('10:00') };
// 1h 54m long, of which the evening period overlaps the first 37 minutes
const trackedLog = {
	id: 'tracked',
	startedAt: '2026-11-10T18:53:00.000Z',
	stoppedAt: '2026-11-10T20:47:00.000Z',
	isRunning: false
};

function renderGuard() {
	const client = new QueryClient();
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(() => useTimeOverlapGuard(), { wrapper });
}

describe('useTimeOverlapGuard', () => {
	it('saves at once when nothing overlaps', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		expect(save).toHaveBeenCalledTimes(1);
		expect(result.current.isConfirmOpen).toBe(false);
		expect(result.current.hasCheckFailed).toBe(false);
	});

	it('holds the save and counts the whole entry when the interval overlaps a part of it', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		expect(save).not.toHaveBeenCalled();
		expect(result.current.isConfirmOpen).toBe(true);
		expect(result.current.summary.totalSeconds).toBe(114 * 60);
		expect(result.current.summary.entries.map((entry) => entry.id)).toEqual(['tracked']);
		expect(result.current.summary.entries[0].removedSeconds).toBe(114 * 60);
	});

	it('saves once the member confirms, and only once', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();
		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		act(() => result.current.confirm());
		act(() => result.current.confirm());

		expect(save).toHaveBeenCalledTimes(1);
		expect(result.current.isConfirmOpen).toBe(false);
	});

	it('saves nothing when the member cancels', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();
		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		act(() => result.current.cancel());
		act(() => result.current.confirm());

		expect(save).not.toHaveBeenCalled();
		expect(result.current.isConfirmOpen).toBe(false);
	});

	it('saves nothing and reports the failure when the lookup fails', async () => {
		mockGetTimeLogConflicts.mockRejectedValue(new Error('The API is unreachable'));
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		expect(save).not.toHaveBeenCalled();
		expect(result.current.hasCheckFailed).toBe(true);
		expect(result.current.isConfirmOpen).toBe(false);
		expect(result.current.isChecking).toBe(false);
	});

	it('clears a previous failure on the next attempt', async () => {
		mockGetTimeLogConflicts.mockRejectedValueOnce(new Error('The API is unreachable'));
		mockGetTimeLogConflicts.mockResolvedValue([]);
		const save = jest.fn();
		const { result } = renderGuard();
		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		expect(result.current.hasCheckFailed).toBe(false);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('looks every period up for the member, and holds the save when any of them overlaps', async () => {
		mockGetTimeLogConflicts.mockResolvedValueOnce([]);
		mockGetTimeLogConflicts.mockResolvedValueOnce([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() =>
			result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [morningPeriod, eveningPeriod], save })
		);

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(2);
		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith({
			employeeId: 'employee-a',
			startDate: morningPeriod.start,
			endDate: morningPeriod.end,
			ignoreId: undefined
		});
		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith({
			employeeId: 'employee-a',
			startDate: eveningPeriod.start,
			endDate: eveningPeriod.end,
			ignoreId: undefined
		});
		expect(save).not.toHaveBeenCalled();
		expect(result.current.isConfirmOpen).toBe(true);
	});

	it('asks the API to leave the edited entry out, and never counts it', async () => {
		mockGetTimeLogConflicts.mockResolvedValue([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() =>
			result.current.saveAfterCheck({
				employeeId: 'employee-a',
				periods: [eveningPeriod],
				ignoredLogId: 'tracked',
				save
			})
		);

		expect(mockGetTimeLogConflicts).toHaveBeenCalledWith(expect.objectContaining({ ignoreId: 'tracked' }));
		expect(save).toHaveBeenCalledTimes(1);
		expect(result.current.isConfirmOpen).toBe(false);
	});

	it('asks the API again on every save, never an earlier answer', async () => {
		mockGetTimeLogConflicts.mockResolvedValueOnce([]);
		mockGetTimeLogConflicts.mockResolvedValueOnce([trackedLog]);
		const save = jest.fn();
		const { result } = renderGuard();
		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		await act(() => result.current.saveAfterCheck({ employeeId: 'employee-a', periods: [eveningPeriod], save }));

		expect(mockGetTimeLogConflicts).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenCalledTimes(1);
		expect(result.current.isConfirmOpen).toBe(true);
	});

	it('leaves the refusal to the API when no member is known', async () => {
		const save = jest.fn();
		const { result } = renderGuard();

		await act(() => result.current.saveAfterCheck({ employeeId: '', periods: [eveningPeriod], save }));

		expect(mockGetTimeLogConflicts).not.toHaveBeenCalled();
		expect(save).toHaveBeenCalledTimes(1);
	});
});
