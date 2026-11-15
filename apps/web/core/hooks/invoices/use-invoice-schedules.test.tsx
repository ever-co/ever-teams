/** @jest-environment jsdom */

import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createSchedule = jest.fn();
jest.mock('@/core/services/client/api/organizations/invoice-schedule.service', () => ({
	invoiceScheduleService: {
		createSchedule: (...args: unknown[]) => createSchedule(...args),
		updateSchedule: jest.fn(),
		deleteSchedule: jest.fn(),
		getSchedules: jest.fn(),
		getRuns: jest.fn()
	}
}));

import { useInvoiceScheduleMutations } from './use-invoice-schedules';

const WORKSPACE = { tenantId: 'tenant-1', organizationId: 'org-1' };
const INPUT = { frequency: 'MONTHLY', startDay: '2026-11-01', grouping: 'PROJECT', sendInvoice: false } as const;

function renderMutations() {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(() => useInvoiceScheduleMutations(WORKSPACE), { wrapper });
	return { result, invalidate };
}

describe('useInvoiceScheduleMutations', () => {
	it('reads the schedules again after a create, whether it went through or not', async () => {
		createSchedule.mockResolvedValueOnce({ id: 'schedule-1' });
		createSchedule.mockRejectedValueOnce(new Error('409: this client already has a schedule'));
		const { result, invalidate } = renderMutations();

		await act(async () => {
			await result.current.createSchedule({ clientId: 'client-1', input: INPUT });
		});
		expect(invalidate).toHaveBeenCalledTimes(1);

		// Another tab set the schedule meanwhile: read again, the page shows it and the dialog edits it
		await act(async () => {
			await result.current.createSchedule({ clientId: 'client-1', input: INPUT }).catch(() => undefined);
		});
		expect(invalidate).toHaveBeenCalledTimes(2);
		expect(invalidate).toHaveBeenLastCalledWith({ queryKey: ['invoice-schedules'] });
	});
});
