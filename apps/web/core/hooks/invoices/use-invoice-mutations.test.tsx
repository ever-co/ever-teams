/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { paidChangeOf } from '@/core/lib/utils/invoice-actions';

const mockSendInvoiceByEmail = jest.fn();
const mockChangeInvoiceStatus = jest.fn();
const mockDeleteInvoice = jest.fn();

jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	invoiceService: {
		sendInvoiceByEmail: (...args: unknown[]) => mockSendInvoiceByEmail(...args),
		changeInvoiceStatus: (...args: unknown[]) => mockChangeInvoiceStatus(...args),
		deleteInvoice: (...args: unknown[]) => mockDeleteInvoice(...args)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));

import { useChangeInvoiceStatus, useDeleteInvoice, useSendInvoice } from './use-invoice-mutations';

const LIST_KEY = queryKeys.invoices.list('tenant-1', 'organization-1');

const draftToSend = { invoiceId: 'inv-1', invoiceNumber: 42, email: 'billing@acme.test', marksSent: true };

interface ListedPage {
	items: Array<{ id: string; status: string }>;
	total: number;
}

function clientWithDraftListed() {
	const queryClient = new QueryClient();
	const list = { pages: [{ items: [{ id: 'inv-1', status: 'DRAFT' }], total: 1 }], pageParams: [1] };
	queryClient.setQueryData(LIST_KEY, list);
	return queryClient;
}

function listedPagesOf(queryClient: QueryClient) {
	const list = queryClient.getQueryData<{ pages: ListedPage[] }>(LIST_KEY);
	return list?.pages ?? [];
}

function listedStatusOf(queryClient: QueryClient) {
	return listedPagesOf(queryClient)[0]?.items[0]?.status;
}

function renderWith<T>(queryClient: QueryClient, hook: () => T) {
	const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(hook, { wrapper });
}

beforeEach(() => {
	mockSendInvoiceByEmail.mockReset();
	mockChangeInvoiceStatus.mockReset();
	mockDeleteInvoice.mockReset();
});

describe('sending an invoice to its client', () => {
	it('e-mails a draft, then marks it Sent, and the list shows it at once', async () => {
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.sendInvoice(draftToSend);
		});

		expect(outcome).toBe('sent');
		expect(mockSendInvoiceByEmail).toHaveBeenCalledTimes(1);
		expect(mockSendInvoiceByEmail.mock.calls[0][0]).toMatchObject({
			invoiceId: 'inv-1',
			email: 'billing@acme.test'
		});
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', { status: 'SENT' });
		expect(listedStatusOf(queryClient)).toBe('SENT');
	});

	it('changes nothing when the sending is refused', async () => {
		mockSendInvoiceByEmail.mockRejectedValue(new Error('Forbidden'));
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		await act(async () => {
			await expect(result.current.sendInvoice(draftToSend)).rejects.toThrow('Forbidden');
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('says so when the e-mail went out but the invoice could not be marked Sent', async () => {
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockChangeInvoiceStatus.mockRejectedValue(new Error('Network Error'));
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.sendInvoice(draftToSend);
		});

		expect(outcome).toBe('sentNotMarked');
		expect(mockSendInvoiceByEmail).toHaveBeenCalledTimes(1);
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('keeps the status of an invoice sent again', async () => {
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		await act(async () => {
			await result.current.sendInvoice({ ...draftToSend, marksSent: false });
		});

		expect(mockSendInvoiceByEmail).toHaveBeenCalledTimes(1);
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});
});

describe('settling and deleting an invoice', () => {
	it('marks an invoice paid in the API, and the list shows it at once', async () => {
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useChangeInvoiceStatus());

		await act(async () => {
			await result.current.changeStatus({ invoiceId: 'inv-1', change: paidChangeOf(1080) });
		});

		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', paidChangeOf(1080));
		expect(listedStatusOf(queryClient)).toBe('FULLY_PAID');
	});

	it('takes a deleted draft out of the list at once', async () => {
		mockDeleteInvoice.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useDeleteInvoice());

		await act(async () => {
			await result.current.deleteInvoice('inv-1');
		});

		expect(mockDeleteInvoice).toHaveBeenCalledWith('inv-1');
		expect(listedPagesOf(queryClient)).toEqual([{ items: [], total: 0 }]);
	});
});
