/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';

jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'org-1',
	getTenantIdCookie: () => 'tenant-1'
}));
jest.mock('@/core/services/client/api/organizations/invoice-schedule.service', () => ({
	invoiceScheduleService: {
		getSchedules: jest.fn(),
		getRuns: jest.fn(),
		createSchedule: jest.fn(),
		updateSchedule: jest.fn(),
		deleteSchedule: jest.fn()
	}
}));

import { OpenedScheduleGoneError } from '@/core/lib/utils/invoice-schedules';
import { queryKeys } from '@/core/query/keys';
import { invoiceScheduleService } from '@/core/services/client/api/organizations/invoice-schedule.service';
import { shellSettledState } from '@/core/stores/common/shell';
import type { TInvoiceSchedule } from '@/core/types/schemas/organization/invoice-schedule.schema';
import { useClientInvoiceSchedule, useInvoiceScheduleMutations } from './use-invoice-schedules';

const mockService = jest.mocked(invoiceScheduleService);

const WORKSPACE = { tenantId: 'tenant-1', organizationId: 'org-1' };

function monthlySchedule(id: string): TInvoiceSchedule {
	return {
		id,
		organizationContactId: 'client-1',
		frequency: 'MONTHLY',
		startDay: '2026-10-01',
		grouping: 'PROJECT',
		sendInvoice: false,
		pausedAt: null,
		activeSince: '2026-10-20T09:00:00Z',
		nextPeriod: { startDay: '2026-11-01', endDay: '2026-11-30', runDay: '2026-12-01' }
	};
}

function setup({ shellSettled = true }: { shellSettled?: boolean } = {}) {
	// One retry, as every read of the app (query config), without its wait
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });
	const store = createStore();
	store.set(shellSettledState, shellSettled);
	const wrapper = ({ children }: { children: ReactNode }) => (
		<Provider store={store}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</Provider>
	);
	return { queryClient, store, wrapper };
}

/** An error as the API service throws it, with the HTTP status. */
function apiError(statusCode: number) {
	return Object.assign(new Error(`HTTP ${statusCode}`), { statusCode, isApiError: true });
}

describe('use-invoice-schedules', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockService.getSchedules.mockResolvedValue([]);
	});

	it('reads a client’s schedule once the shell has settled, and offers nothing to set before that', async () => {
		const { store, wrapper } = setup({ shellSettled: false });
		const { result } = renderHook(() => useClientInvoiceSchedule('client-1', { enabled: true }), { wrapper });

		expect(mockService.getSchedules).not.toHaveBeenCalled();
		expect(result.current.isLoading).toBe(true);

		act(() => store.set(shellSettledState, true));

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(mockService.getSchedules).toHaveBeenCalledTimes(1);
		expect(result.current.schedule).toBeNull();
	});

	it('tells an API without billing schedules apart from a failed read, and does not ask it again', async () => {
		mockService.getSchedules.mockRejectedValue(apiError(404));
		const { wrapper } = setup();
		const { result } = renderHook(() => useClientInvoiceSchedule('client-1', { enabled: true }), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.isUnavailable).toBe(true);
		expect(mockService.getSchedules).toHaveBeenCalledTimes(1);
	});

	it('reads the schedules again after a create is refused, so the form opens next time on the one set elsewhere', async () => {
		mockService.createSchedule.mockRejectedValue(apiError(409));
		const { queryClient, wrapper } = setup();
		const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
		const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

		await expect(
			result.current.createSchedule({
				clientId: 'client-1',
				input: { frequency: 'MONTHLY', startDay: '2026-11-01', grouping: 'PROJECT', sendInvoice: false }
			})
		).rejects.toThrow('HTTP 409');

		expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoiceSchedules.all });
	});

	describe('a change saved from a form that opened on a schedule', () => {
		const opened = monthlySchedule('schedule-1');

		it('saves it to that schedule while it is still the client’s', async () => {
			mockService.updateSchedule.mockResolvedValue({ ...opened, grouping: 'TASK' });
			const { wrapper } = setup();
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			await expect(
				result.current.updateOpenedSchedule({
					scheduleId: 'schedule-1',
					latest: opened,
					change: { grouping: 'TASK' }
				})
			).resolves.toMatchObject({ id: 'schedule-1', grouping: 'TASK' });

			expect(mockService.updateSchedule).toHaveBeenCalledWith('schedule-1', { grouping: 'TASK' }, WORKSPACE);
		});

		it('changes nothing when another tab replaced it, says so, and reads the schedules again', async () => {
			const { queryClient, wrapper } = setup();
			const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			const saving = result.current.updateOpenedSchedule({
				scheduleId: 'schedule-1',
				latest: monthlySchedule('schedule-2'),
				change: { grouping: 'TASK' }
			});

			await expect(saving).rejects.toBeInstanceOf(OpenedScheduleGoneError);
			await expect(saving).rejects.toMatchObject({ fate: 'replaced' });
			expect(mockService.updateSchedule).not.toHaveBeenCalled();
			expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoiceSchedules.all });
		});

		it('changes nothing when no schedule is left, fails instead of passing, and reads the schedules again', async () => {
			const { queryClient, wrapper } = setup();
			const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			await expect(
				result.current.updateOpenedSchedule({ scheduleId: 'schedule-1', latest: null, change: {} })
			).rejects.toMatchObject({ name: 'OpenedScheduleGoneError', fate: 'deleted' });

			expect(mockService.updateSchedule).not.toHaveBeenCalled();
			expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoiceSchedules.all });
		});

		it('fails as deleted when the API answers that the schedule no longer exists', async () => {
			mockService.updateSchedule.mockRejectedValue(apiError(404));
			const { queryClient, wrapper } = setup();
			const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			await expect(
				result.current.updateOpenedSchedule({ scheduleId: 'schedule-1', latest: opened, change: {} })
			).rejects.toMatchObject({ name: 'OpenedScheduleGoneError', fate: 'deleted' });

			expect(mockService.updateSchedule).toHaveBeenCalledWith('schedule-1', {}, WORKSPACE);
			await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.invoiceSchedules.all }));
		});

		it('changes nothing while the client’s schedule is not read, and does not say it was deleted', async () => {
			const { wrapper } = setup();
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			const saving = result.current.updateOpenedSchedule({
				scheduleId: 'schedule-1',
				latest: undefined,
				change: {}
			});

			await expect(saving).rejects.toThrow('not read yet');
			await expect(saving).rejects.not.toBeInstanceOf(OpenedScheduleGoneError);
			expect(mockService.updateSchedule).not.toHaveBeenCalled();
		});

		it('keeps the same function from one render to the next', () => {
			const { wrapper } = setup();
			const { result, rerender } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });
			const first = result.current.updateOpenedSchedule;

			rerender();

			expect(result.current.updateOpenedSchedule).toBe(first);
		});

		it('passes any other refusal on as it came', async () => {
			mockService.updateSchedule.mockRejectedValue(apiError(400));
			const { wrapper } = setup();
			const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });

			await expect(
				result.current.updateOpenedSchedule({ scheduleId: 'schedule-1', latest: opened, change: {} })
			).rejects.toThrow('HTTP 400');
		});
	});
});
