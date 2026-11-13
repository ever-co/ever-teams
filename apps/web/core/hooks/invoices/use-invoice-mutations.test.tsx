/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';

const mockInvoiceService = { createInvoice: jest.fn() };

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	get invoiceService() {
		return mockInvoiceService;
	}
}));

import { useCreateInvoice } from './use-invoice-mutations';

function renderCreateInvoice() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const rendered = renderHook(() => useCreateInvoice(), { wrapper });
	return { ...rendered, invalidateQueries };
}

const request = { id: 'invoice-1', invoiceNumber: 7 } as InvoiceRequest;

describe('saving an invoice and the invoices already saved', () => {
	beforeEach(() => {
		mockInvoiceService.createInvoice.mockReset();
	});

	it('reads them again after a failed save: the invoice may have been saved all the same', async () => {
		mockInvoiceService.createInvoice.mockRejectedValue(new Error('Network Error'));
		const { result, invalidateQueries } = renderCreateInvoice();

		await act(async () => {
			await result.current.createInvoice(request).catch(() => undefined);
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices'] });
	});

	it('reads them again after a save', async () => {
		mockInvoiceService.createInvoice.mockResolvedValue({ id: 'invoice-1' });
		const { result, invalidateQueries } = renderCreateInvoice();

		await act(async () => {
			await result.current.createInvoice(request);
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices'] });
	});
});
