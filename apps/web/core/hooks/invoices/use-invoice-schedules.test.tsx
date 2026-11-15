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

import { queryKeys } from '@/core/query/keys';
import { invoiceScheduleService } from '@/core/services/client/api/organizations/invoice-schedule.service';
import { shellSettledState } from '@/core/stores/common/shell';
import { useClientInvoiceSchedule, useInvoiceScheduleMutations } from './use-invoice-schedules';

const mockService = jest.mocked(invoiceScheduleService);

const WORKSPACE = { tenantId: 'tenant-1', organizationId: 'org-1' };

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
});
