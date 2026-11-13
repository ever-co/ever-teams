/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { paidChangeOf } from '@/core/lib/utils/invoice-actions';

const mockCreateInvoice = jest.fn();
const mockSendInvoiceByEmail = jest.fn();
const mockChangeInvoiceStatus = jest.fn();
const mockDeleteInvoice = jest.fn();

jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	invoiceService: {
		createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
		sendInvoiceByEmail: (...args: unknown[]) => mockSendInvoiceByEmail(...args),
		changeInvoiceStatus: (...args: unknown[]) => mockChangeInvoiceStatus(...args),
		deleteInvoice: (...args: unknown[]) => mockDeleteInvoice(...args)
	}
}));
const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => mockCookieScope.tenantId,
	getOrganizationIdCookie: () => mockCookieScope.organizationId
}));

import {
	useChangeInvoiceStatus,
	useCreateInvoice,
	useDeleteInvoice,
	useSaveAndSendInvoice,
	useSendInvoice
} from './use-invoice-mutations';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';

const LIST_KEY = queryKeys.invoices.list('tenant-1', 'organization-1');

const LIST_SCOPE = { organizationId: 'organization-1', tenantId: 'tenant-1' };

const draftToSend = {
	invoiceId: 'inv-1',
	invoiceNumber: 42,
	email: 'billing@acme.test',
	marksSent: true,
	scope: LIST_SCOPE
};

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

function renderCreateInvoice() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
	const rendered = renderWith(queryClient, () => useCreateInvoice());
	return { ...rendered, invalidateQueries };
}

beforeEach(() => {
	mockCreateInvoice.mockReset();
	mockSendInvoiceByEmail.mockReset();
	mockChangeInvoiceStatus.mockReset();
	mockDeleteInvoice.mockReset();
	mockCookieScope.organizationId = 'organization-1';
	mockCookieScope.tenantId = 'tenant-1';
});

describe('saving an invoice and the invoices already saved', () => {
	const request = { id: 'invoice-1', invoiceNumber: 7 } as InvoiceRequest;

	it('reads them again after a failed save: the invoice may have been saved all the same', async () => {
		mockCreateInvoice.mockRejectedValue(new Error('Network Error'));
		const { result, invalidateQueries } = renderCreateInvoice();

		await act(async () => {
			await result.current.createInvoice(request).catch(() => undefined);
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices'] });
	});

	it('reads them again after a save', async () => {
		mockCreateInvoice.mockResolvedValue({ id: 'invoice-1' });
		const { result, invalidateQueries } = renderCreateInvoice();

		await act(async () => {
			await result.current.createInvoice(request);
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices'] });
	});
});

describe('saving a new invoice and sending it', () => {
	const request = {
		id: 'inv-9',
		invoiceNumber: 9,
		organizationId: 'organization-1',
		tenantId: 'tenant-1'
	} as InvoiceRequest;

	it('saves it, e-mails it, then marks it Sent', async () => {
		mockCreateInvoice.mockResolvedValue({ id: 'inv-9', invoiceNumber: 9 });
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const { result } = renderWith(new QueryClient(), () => useSaveAndSendInvoice());

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveAndSendInvoice({ request, email: 'billing@acme.test' });
		});

		expect(saved).toEqual({ invoice: { id: 'inv-9', invoiceNumber: 9 }, outcome: 'sent' });
		expect(mockSendInvoiceByEmail.mock.calls[0][0]).toMatchObject({ invoiceId: 'inv-9', invoiceNumber: 9 });
		expect(mockSendInvoiceByEmail.mock.calls[0][1]).toEqual(LIST_SCOPE);
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-9', { status: 'SENT' }, LIST_SCOPE);
	});

	it('leaves the saved draft unsent when another tab switched the workspace during the save', async () => {
		mockCreateInvoice.mockImplementation(async () => {
			mockCookieScope.organizationId = 'organization-2';
			return { id: 'inv-9', invoiceNumber: 9 };
		});
		const { result } = renderWith(new QueryClient(), () => useSaveAndSendInvoice());

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveAndSendInvoice({ request, email: 'billing@acme.test' });
		});

		expect(saved).toEqual({ invoice: { id: 'inv-9', invoiceNumber: 9 }, outcome: 'notSent' });
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('leaves a saved draft and says so when the sending is refused', async () => {
		mockCreateInvoice.mockResolvedValue({ id: 'inv-9', invoiceNumber: 9 });
		mockSendInvoiceByEmail.mockRejectedValue(new Error('Bad Request'));
		const { result } = renderWith(new QueryClient(), () => useSaveAndSendInvoice());

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveAndSendInvoice({ request, email: 'billing@acme.test' });
		});

		expect(saved).toEqual({ invoice: { id: 'inv-9', invoiceNumber: 9 }, outcome: 'notSent' });
		expect(mockCreateInvoice).toHaveBeenCalledTimes(1);
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});

	it('sends nothing when the invoice is not saved', async () => {
		mockCreateInvoice.mockRejectedValue(new Error('A record with these values already exists.'));
		const { result } = renderWith(new QueryClient(), () => useSaveAndSendInvoice());

		await act(async () => {
			await expect(result.current.saveAndSendInvoice({ request, email: 'billing@acme.test' })).rejects.toThrow();
		});

		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});
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
		expect(mockSendInvoiceByEmail.mock.calls[0][1]).toEqual(LIST_SCOPE);
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', { status: 'SENT' }, LIST_SCOPE);
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
			await result.current.changeStatus({ invoiceId: 'inv-1', change: paidChangeOf(1080), scope: LIST_SCOPE });
		});

		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', paidChangeOf(1080), LIST_SCOPE);
		expect(listedStatusOf(queryClient)).toBe('FULLY_PAID');
	});

	it('takes a deleted draft out of the list at once', async () => {
		mockDeleteInvoice.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useDeleteInvoice());

		await act(async () => {
			await result.current.deleteInvoice({ invoiceId: 'inv-1', scope: LIST_SCOPE });
		});

		expect(mockDeleteInvoice).toHaveBeenCalledWith('inv-1', LIST_SCOPE);
		expect(listedPagesOf(queryClient)).toEqual([{ items: [], total: 0 }]);
	});
});

const SWITCHED_WORKSPACES = [
	['organization', { organizationId: 'organization-2', tenantId: 'tenant-1' }],
	['tenant', { organizationId: 'organization-1', tenantId: 'tenant-2' }]
] as const;

describe.each(SWITCHED_WORKSPACES)('an invoice of the list after another tab switched the %s', (_switched, cookies) => {
	beforeEach(() => {
		mockCookieScope.organizationId = cookies.organizationId;
		mockCookieScope.tenantId = cookies.tenantId;
	});

	it('is not e-mailed, and stays a draft', async () => {
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		await act(async () => {
			await expect(result.current.sendInvoice(draftToSend)).rejects.toThrow();
		});

		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('is not marked paid', async () => {
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useChangeInvoiceStatus());
		const toPaid = { invoiceId: 'inv-1', change: paidChangeOf(1080), scope: LIST_SCOPE };

		await act(async () => {
			await expect(result.current.changeStatus(toPaid)).rejects.toThrow();
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('is not deleted', async () => {
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useDeleteInvoice());

		await act(async () => {
			await expect(result.current.deleteInvoice({ invoiceId: 'inv-1', scope: LIST_SCOPE })).rejects.toThrow();
		});

		expect(mockDeleteInvoice).not.toHaveBeenCalled();
		expect(listedPagesOf(queryClient)[0]?.items).toHaveLength(1);
	});
});
