/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { paidChangeOf } from '@/core/lib/utils/invoice-actions';
import { invoiceTermsOf } from '@/core/lib/utils/invoices';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const mockCreateInvoice = jest.fn();
const mockSendInvoiceByEmail = jest.fn();
const mockChangeInvoiceStatus = jest.fn();
const mockGetInvoiceStatus = jest.fn();
const mockDeleteInvoice = jest.fn();
const mockGetInvoice = jest.fn();
const mockUpdateInvoice = jest.fn();
const mockReplaceInvoiceLines = jest.fn();

jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	invoiceService: {
		createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
		sendInvoiceByEmail: (...args: unknown[]) => mockSendInvoiceByEmail(...args),
		changeInvoiceStatus: (...args: unknown[]) => mockChangeInvoiceStatus(...args),
		getInvoiceStatus: (...args: unknown[]) => mockGetInvoiceStatus(...args),
		deleteInvoice: (...args: unknown[]) => mockDeleteInvoice(...args),
		getInvoice: (...args: unknown[]) => mockGetInvoice(...args),
		updateInvoice: (...args: unknown[]) => mockUpdateInvoice(...args),
		replaceInvoiceLines: (...args: unknown[]) => mockReplaceInvoiceLines(...args)
	}
}));
const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1', accessToken: 'token-1' };
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => mockCookieScope.tenantId,
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getAccessTokenCookie: () => mockCookieScope.accessToken
}));
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: '' }
}));

import {
	useChangeInvoiceStatus,
	useCreateInvoice,
	useDeleteInvoice,
	useSaveAndSendInvoice,
	useSaveInvoiceEdit,
	useSendInvoice,
	useVoidToReplace,
	type InvoiceEdit
} from './use-invoice-mutations';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** Empty in proxy mode; the API's address when the browser calls it directly. */
const mockApiAddress = GAUZY_API_BASE_SERVER_URL as { value: string };

const LIST_KEY = queryKeys.invoices.list('tenant-1', 'organization-1');

const LIST_SCOPE = { organizationId: 'organization-1', tenantId: 'tenant-1' };

const SWITCHED_WORKSPACES = [
	['organization', { organizationId: 'organization-2', tenantId: 'tenant-1' }],
	['tenant', { organizationId: 'organization-1', tenantId: 'tenant-2' }]
] as const;

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
	mockGetInvoiceStatus.mockReset();
	mockGetInvoiceStatus.mockResolvedValue('DRAFT');
	mockDeleteInvoice.mockReset();
	mockGetInvoice.mockReset();
	mockUpdateInvoice.mockReset();
	mockReplaceInvoiceLines.mockReset();
	mockCookieScope.organizationId = 'organization-1';
	mockCookieScope.tenantId = 'tenant-1';
	mockCookieScope.accessToken = 'token-1';
	mockApiAddress.value = '';
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

	it('keeps a status reached while the e-mail went out: an invoice paid meanwhile is not taken back to Sent', async () => {
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockGetInvoiceStatus.mockResolvedValue('FULLY_PAID');
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.sendInvoice(draftToSend);
		});

		expect(outcome).toBe('sent');
		expect(mockGetInvoiceStatus).toHaveBeenCalledWith('inv-1', LIST_SCOPE);
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('sends nothing when the invoice cannot be read before the e-mail', async () => {
		mockGetInvoiceStatus.mockRejectedValue(new Error('Network Error'));
		const { result } = renderWith(clientWithDraftListed(), () => useSendInvoice());

		await act(async () => {
			await expect(result.current.sendInvoice(draftToSend)).rejects.toThrow();
		});

		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('marks nothing when the invoice cannot be read again after the e-mail, and says so', async () => {
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockGetInvoiceStatus.mockResolvedValueOnce('DRAFT').mockRejectedValue(new Error('Network Error'));
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.sendInvoice(draftToSend);
		});

		expect(outcome).toBe('sentNotMarked');
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
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

	it('keeps every invoice whose status change runs marked as changing, not only the latest one', async () => {
		const answers: Array<() => void> = [];
		mockChangeInvoiceStatus.mockImplementation(() => new Promise<void>((resolve) => answers.push(resolve)));
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useChangeInvoiceStatus());

		act(() => {
			void result.current.changeStatus({ invoiceId: 'inv-1', change: paidChangeOf(10), scope: LIST_SCOPE });
			void result.current.changeStatus({ invoiceId: 'inv-2', change: paidChangeOf(20), scope: LIST_SCOPE });
		});
		await waitFor(() => expect(answers).toHaveLength(2));
		await waitFor(() => expect(result.current.changingIds).toEqual(new Set(['inv-1', 'inv-2'])));

		act(() => answers[1]());
		await waitFor(() => expect(result.current.changingIds).toEqual(new Set(['inv-1'])));

		act(() => answers[0]());
		await waitFor(() => expect(result.current.changingIds.size).toBe(0));
	});

	it('e-mails nothing once the invoice was voided while its dialog was open', async () => {
		mockGetInvoiceStatus.mockResolvedValue('VOID');
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useSendInvoice());

		await act(async () => {
			await expect(result.current.sendInvoice(draftToSend)).rejects.toMatchObject({ status: 409 });
		});

		// An e-mail cannot be taken back: the status is read before anything is sent
		expect(mockGetInvoiceStatus).toHaveBeenCalledWith('inv-1', LIST_SCOPE);
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
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

	it.each(['SENT', 'FULLY_PAID'])(
		'deletes nothing once the draft became %s while its dialog was open',
		async (status) => {
			mockGetInvoiceStatus.mockResolvedValue(status);
			const queryClient = clientWithDraftListed();
			const { result } = renderWith(queryClient, () => useDeleteInvoice());

			await act(async () => {
				await expect(
					result.current.deleteInvoice({ invoiceId: 'inv-1', scope: LIST_SCOPE })
				).rejects.toMatchObject({
					status: 409
				});
			});

			expect(mockGetInvoiceStatus).toHaveBeenCalledWith('inv-1', LIST_SCOPE);
			expect(mockDeleteInvoice).not.toHaveBeenCalled();
			expect(listedStatusOf(queryClient)).toBe('DRAFT');
		}
	);

	it('deletes nothing when another tab switched the workspace while the invoice was read', async () => {
		mockGetInvoiceStatus.mockImplementation(async () => {
			mockCookieScope.organizationId = 'organization-2';
			return 'DRAFT';
		});
		const { result } = renderWith(clientWithDraftListed(), () => useDeleteInvoice());

		await act(async () => {
			await expect(result.current.deleteInvoice({ invoiceId: 'inv-1', scope: LIST_SCOPE })).rejects.toThrow();
		});

		expect(mockDeleteInvoice).not.toHaveBeenCalled();
	});

	it('voids nothing once the invoice was paid while its dialog was open', async () => {
		mockGetInvoiceStatus.mockResolvedValue('FULLY_PAID');
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useChangeInvoiceStatus());

		await act(async () => {
			await expect(
				result.current.changeStatus({ invoiceId: 'inv-1', change: { status: 'VOID' }, scope: LIST_SCOPE })
			).rejects.toMatchObject({ status: 409 });
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});
});

describe('marking a listed invoice paid or unpaid', () => {
	/** The invoice as the API holds it now: its total was edited from 800 to 960 in another tab since the list read it. */
	const invoiceNow = { id: 'inv-1', invoiceNumber: 42, totalValue: 960, status: 'SENT' };

	function renderStatusChange() {
		const queryClient = clientWithDraftListed();
		const rendered = renderWith(queryClient, () => useChangeInvoiceStatus());
		return { ...rendered, queryClient };
	}

	it('marks paid the total the invoice has now, read before the change', async () => {
		mockGetInvoice.mockResolvedValue(invoiceNow);
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const { result, queryClient } = renderStatusChange();

		await act(async () => {
			await result.current.changeStatus({ invoiceId: 'inv-1', payment: 'markPaid', scope: LIST_SCOPE });
		});

		expect(mockGetInvoice).toHaveBeenCalledWith('inv-1', { tenantId: 'tenant-1' });
		const paid = { status: 'FULLY_PAID', paid: true, alreadyPaid: 960, amountDue: 0 };
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', paid, LIST_SCOPE);
		expect(mockGetInvoice.mock.invocationCallOrder[0]).toBeLessThan(
			mockChangeInvoiceStatus.mock.invocationCallOrder[0]
		);
		expect(listedStatusOf(queryClient)).toBe('FULLY_PAID');
	});

	it('marks unpaid with the total the invoice has now as the amount due', async () => {
		mockGetInvoice.mockResolvedValue({ ...invoiceNow, status: 'FULLY_PAID' });
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const { result, queryClient } = renderStatusChange();

		await act(async () => {
			await result.current.changeStatus({ invoiceId: 'inv-1', payment: 'markUnpaid', scope: LIST_SCOPE });
		});

		const unpaid = { status: 'SENT', paid: false, alreadyPaid: 0, amountDue: 960 };
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', unpaid, LIST_SCOPE);
		expect(listedStatusOf(queryClient)).toBe('SENT');
	});

	it.each([
		['markPaid', 'FULLY_PAID'],
		['markPaid', 'OVERPAID'],
		['markPaid', 'VOID'],
		['markUnpaid', 'DRAFT'],
		['markUnpaid', 'SENT'],
		['markUnpaid', 'VIEWED'],
		['markUnpaid', 'PARTIALLY_PAID']
	] as const)('refuses %s once the invoice became %s, and writes nothing', async (payment, status) => {
		mockGetInvoice.mockResolvedValue({ ...invoiceNow, status });
		const { result, queryClient } = renderStatusChange();

		await act(async () => {
			await expect(
				result.current.changeStatus({ invoiceId: 'inv-1', payment, scope: LIST_SCOPE })
			).rejects.toMatchObject({ status: 409 });
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('writes nothing when the invoice cannot be read', async () => {
		mockGetInvoice.mockRejectedValue(new Error('The API is unreachable'));
		const { result } = renderStatusChange();

		await act(async () => {
			await expect(
				result.current.changeStatus({ invoiceId: 'inv-1', payment: 'markPaid', scope: LIST_SCOPE })
			).rejects.toThrow();
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});

	it('writes nothing when another tab switched the workspace while the invoice was read', async () => {
		mockGetInvoice.mockImplementation(async () => {
			mockCookieScope.organizationId = 'organization-2';
			return invoiceNow;
		});
		const { result } = renderStatusChange();

		await act(async () => {
			await expect(
				result.current.changeStatus({ invoiceId: 'inv-1', payment: 'markPaid', scope: LIST_SCOPE })
			).rejects.toThrow();
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});
});

describe('voiding a paid invoice to replace it', () => {
	const paidInvoice = {
		id: 'inv-1',
		invoiceNumber: 42,
		invoiceDate: '2026-10-31T23:00:00.000Z',
		dueDate: '2026-11-30T22:59:59.999Z',
		currency: 'USD',
		totalValue: 800,
		status: 'FULLY_PAID',
		terms: invoiceTermsOf({ fromDay: '2026-10-01', toDay: '2026-10-31' }, ''),
		toContactId: 'client-acme',
		organizationId: 'organization-1',
		tenantId: 'tenant-1',
		invoiceType: 'BY_PROJECT_HOURS',
		invoiceItems: [
			{ id: 'item-1', description: 'Ana Lima', price: 80, quantity: 10, totalValue: 800, projectId: 'p1' }
		]
	};

	it.each(['SENT', 'VOID'])('voids nothing once the invoice became %s while its dialog was open', async (status) => {
		mockGetInvoice.mockResolvedValue({ ...paidInvoice, status });
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useVoidToReplace());

		await act(async () => {
			await expect(result.current.voidToReplace({ invoiceId: 'inv-1', scope: LIST_SCOPE })).rejects.toMatchObject(
				{
					status: 409
				}
			);
		});

		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
		expect(listedStatusOf(queryClient)).toBe('DRAFT');
	});

	it('reads it whole, then voids it, and the list shows it at once', async () => {
		mockGetInvoice.mockResolvedValue(paidInvoice);
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useVoidToReplace());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.voidToReplace({ invoiceId: 'inv-1', scope: LIST_SCOPE });
		});

		expect(outcome).toBe('voided');
		expect(mockGetInvoice).toHaveBeenCalledWith('inv-1', { tenantId: 'tenant-1' });
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-1', { status: 'VOID' }, LIST_SCOPE);
		expect(listedStatusOf(queryClient)).toBe('VOID');
	});

	it.each([
		['a second tax', { tax2: 5 }],
		['a flat discount', { discountValue: 50, discountType: 'FLAT' }],
		['a line without a project', { invoiceItems: [{ ...paidInvoice.invoiceItems[0], projectId: null }] }]
	])('leaves one with %s as it was: the invoice screen could not rebuild it', async (_kind, change) => {
		mockGetInvoice.mockResolvedValue({ ...paidInvoice, ...change });
		const { result } = renderWith(clientWithDraftListed(), () => useVoidToReplace());

		let outcome: unknown = null;
		await act(async () => {
			outcome = await result.current.voidToReplace({ invoiceId: 'inv-1', scope: LIST_SCOPE });
		});

		expect(outcome).toBe('notRebuildable');
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});
});

describe('saving an edit to an invoice', () => {
	const previousLine = { description: 'Ana Lima', price: 80, quantity: 10, totalValue: 800, projectId: 'p1' };
	const editedLine = { ...previousLine, quantity: 12, totalValue: 960 };
	const fields = {
		invoiceNumber: 42,
		invoiceDate: '2026-10-31T23:00:00.000Z',
		dueDate: '2026-11-30T22:59:59.999Z',
		currency: 'USD',
		discountValue: 0,
		tax: 0,
		terms: 'Billable time from 2026-10-01 to 2026-10-31',
		status: 'SENT'
	};
	const workspace = { organizationId: 'organization-1', tenantId: 'tenant-1' };
	const edit = {
		invoiceId: 'inv-42',
		scope: workspace,
		revision: { update: { ...fields, totalValue: 960 }, lines: [editedLine] },
		previous: { update: { ...fields, totalValue: 800 }, lines: [previousLine] },
		previousLineIds: ['item-1']
	} as unknown as InvoiceEdit;
	const sending = {
		invoiceId: 'inv-42',
		invoiceNumber: 42,
		email: 'billing@acme.test',
		marksSent: false,
		scope: workspace
	};

	function invoiceRead(status: string, lines: unknown[] = [{ id: 'item-1', ...previousLine }]) {
		return { id: 'inv-42', ...fields, totalValue: 800, status, invoiceItems: lines };
	}

	function serverFailure() {
		return ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 500',
			status: 500,
			response: { data: {}, headers: {}, status: 500, statusText: 'Internal Server Error' }
		});
	}

	function refusal() {
		return ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 400',
			status: 400,
			response: { data: {}, headers: {}, status: 400, statusText: 'Bad Request' }
		});
	}

	function renderSaveEdit() {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
		const rendered = renderWith(queryClient, () => useSaveInvoiceEdit());
		return { ...rendered, invalidateQueries };
	}

	async function saveWith(
		result: { current: ReturnType<typeof useSaveInvoiceEdit> },
		withSending: typeof sending | null = null
	) {
		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveInvoiceEdit({ edit, sending: withSending });
		});
		return saved;
	}

	it('reads the invoice, writes its fields, then its lines, and reads the invoices again', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		const { result, invalidateQueries } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: null });
		expect(mockGetInvoice).toHaveBeenCalledWith('inv-42', { tenantId: 'tenant-1' });
		expect(mockUpdateInvoice).toHaveBeenCalledWith('inv-42', edit.revision.update, workspace);
		expect(mockReplaceInvoiceLines).toHaveBeenCalledWith('inv-42', edit.revision.lines, workspace);
		expect(mockUpdateInvoice.mock.invocationCallOrder[0]).toBeLessThan(
			mockReplaceInvoiceLines.mock.invocationCallOrder[0]
		);
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['invoices'] });
	});

	it('writes nothing once its lines were written back under new ids since it was opened', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT', [{ id: 'item-9', ...previousLine }]));
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'changed' }, sending: null });
		expect(mockUpdateInvoice).not.toHaveBeenCalled();
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it('writes no lines for an edit that leaves them as they were, since the API deletes them before saving new ones', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		const dueDateOnly = {
			...edit,
			revision: {
				update: { ...fields, totalValue: 800, dueDate: '2026-12-15T22:59:59.999Z' },
				lines: [previousLine]
			}
		} as unknown as InvoiceEdit;
		const { result } = renderSaveEdit();

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveInvoiceEdit({ edit: dueDateOnly, sending: null });
		});

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledWith('inv-42', dueDateOnly.revision.update, workspace);
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it('writes the lines of an edit that only records the time they bill, since the API marks it billed with them', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		const recordsBilledTime = {
			...edit,
			revision: {
				update: { ...fields, totalValue: 800 },
				lines: [{ ...previousLine, timeLogIds: ['log-1'] }]
			}
		} as unknown as InvoiceEdit;
		const { result } = renderSaveEdit();

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveInvoiceEdit({ edit: recordsBilledTime, sending: null });
		});

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledWith(
			'inv-42',
			[expect.objectContaining({ timeLogIds: ['log-1'] })],
			workspace
		);
	});

	it('keeps a status the invoice reached since it was opened', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('VIEWED'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		const { result } = renderSaveEdit();

		await saveWith(result);

		expect(mockUpdateInvoice.mock.calls[0][1]).toMatchObject({ status: 'VIEWED', totalValue: 960 });
	});

	it('writes nothing over an invoice something was paid on since it was opened', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('PARTIALLY_PAID'));
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'locked' }, sending: null });
		expect(mockUpdateInvoice).not.toHaveBeenCalled();
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('leaves the editor’s own read for its dialog to close when the invoice was paid since it was opened', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('FULLY_PAID'));
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const editorRead = queryKeys.invoices.detail('tenant-1', 'organization-1', 'inv-42');
		queryClient.setQueryData(editorRead, invoiceRead('SENT'));
		queryClient.setQueryData(LIST_KEY, { pages: [], pageParams: [1] });
		const { result } = renderWith(queryClient, () => useSaveInvoiceEdit());

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'locked' }, sending: null });
		expect(queryClient.getQueryState(editorRead)?.isInvalidated).toBe(false);
		expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
	});

	it('leaves the editor’s own read for its dialog to close when the invoice was paid while its lines were refused', async () => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('FULLY_PAID', []), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(serverFailure());
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const editorRead = queryKeys.invoices.detail('tenant-1', 'organization-1', 'inv-42');
		queryClient.setQueryData(editorRead, invoiceRead('SENT'));
		queryClient.setQueryData(LIST_KEY, { pages: [], pageParams: [1] });
		const { result } = renderWith(queryClient, () => useSaveInvoiceEdit());

		const saved = await saveWith(result);

		// Read now, the paid invoice would replace the editor, and the dialog saying its lines may be gone with it
		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 0 }, sending: null });
		expect(queryClient.getQueryState(editorRead)?.isInvalidated).toBe(false);
		expect(queryClient.getQueryState(LIST_KEY)?.isInvalidated).toBe(true);
	});

	it.each([
		[
			'a line',
			{
				...invoiceRead('SENT'),
				invoiceItems: [{ id: 'item-1', ...previousLine, description: 'Ana Lima, design' }]
			}
		],
		['a field', { ...invoiceRead('SENT'), dueDate: '2026-12-15T22:59:59.999Z' }]
	])('writes nothing over %s saved from elsewhere since it was opened', async (_changed, current) => {
		mockGetInvoice.mockResolvedValue(current);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'changed' }, sending: null });
		expect(mockUpdateInvoice).not.toHaveBeenCalled();
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('writes nothing when the invoice cannot be read first', async () => {
		mockGetInvoice.mockRejectedValue(serverFailure());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notChecked' }, sending: null });
		expect(mockUpdateInvoice).not.toHaveBeenCalled();
	});

	it('changes nothing more when the API refuses the fields: its lines are never touched', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockRejectedValue(refusal());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notSaved' }, sending: null });
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
		expect(mockGetInvoice).toHaveBeenCalledTimes(1);
	});

	it('puts its lines back first when they were deleted and not saved, then its fields', async () => {
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(invoiceRead('SENT', []));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValueOnce(serverFailure()).mockResolvedValueOnce(undefined);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'putBack' }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenLastCalledWith('inv-42', edit.previous.lines, workspace);
		expect(mockUpdateInvoice).toHaveBeenLastCalledWith('inv-42', edit.previous.update, workspace);
		expect(mockReplaceInvoiceLines.mock.invocationCallOrder[1]).toBeLessThan(
			mockUpdateInvoice.mock.invocationCallOrder[1]
		);
	});

	it('leaves the lines the invoice still holds and puts back its fields only', async () => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('SENT'), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(refusal());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'putBack' }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledTimes(1);
		expect(mockUpdateInvoice).toHaveBeenLastCalledWith('inv-42', edit.previous.update, workspace);
	});

	it('puts the invoice back when the answer to its fields was lost and they were written', async () => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('SENT'), ...fields, totalValue: 960 });
		mockUpdateInvoice
			.mockRejectedValueOnce(ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' }))
			.mockResolvedValueOnce(undefined);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'putBack' }, sending: null });
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
		expect(mockUpdateInvoice).toHaveBeenLastCalledWith('inv-42', edit.previous.update, workspace);
	});

	it('says the connection failed when its fields never reached the API, writing nothing back', async () => {
		const asBefore = { ...invoiceRead('SENT'), ...fields, totalValue: 800 };
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(asBefore);
		mockUpdateInvoice.mockRejectedValue(
			ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' })
		);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notReached' }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it('says nothing was saved when the API failed on its fields and wrote nothing', async () => {
		const asBefore = { ...invoiceRead('SENT'), ...fields, totalValue: 800 };
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(asBefore);
		mockUpdateInvoice.mockRejectedValue(serverFailure());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notSaved' }, sending: null });
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it('writes nothing over an invoice it could not read back after a failed save', async () => {
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockRejectedValue(serverFailure());
		mockUpdateInvoice.mockRejectedValueOnce(
			ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' })
		);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		// Unread, the invoice may hold anything: the lines are not deleted and rewritten blind
		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: null }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it.each([
		['newer lines and their total', { totalValue: 880 }],
		['newer lines, with its own fields written', {}]
	])('leaves as it is an invoice saved from elsewhere (%s) while its fields failed', async (_saved, elsewhere) => {
		const newDueDate = '2026-12-15T22:59:59.999Z';
		const dueDateOnly = {
			...edit,
			revision: { update: { ...fields, totalValue: 800, dueDate: newDueDate }, lines: [previousLine] }
		} as unknown as InvoiceEdit;
		const linesSavedElsewhere = [{ id: 'item-2', ...previousLine, quantity: 11, totalValue: 880 }];
		const readBack = { ...invoiceRead('SENT', linesSavedElsewhere), dueDate: newDueDate, ...elsewhere };
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(readBack);
		mockUpdateInvoice.mockRejectedValueOnce(serverFailure());
		const { result } = renderSaveEdit();

		let saved: unknown = null;
		await act(async () => {
			saved = await result.current.saveInvoiceEdit({ edit: dueDateOnly, sending: null });
		});

		// Putting back what was read would set the old total over the newer lines, or replace them
		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 1 }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it.each([
		['paid', 'FULLY_PAID'],
		['voided', 'VOID']
	])('never puts back an invoice %s while its lines were refused', async (_reached, status) => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead(status, []), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(serverFailure());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		// Its fields hold the status the save was written under: written back, they would take the payment back
		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 0 }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledTimes(1);
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
	});

	it('leaves lines saved from elsewhere as they are once its own lines were refused', async () => {
		const linesSavedElsewhere = [{ id: 'item-3', ...editedLine, quantity: 9, totalValue: 720 }];
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('SENT', linesSavedElsewhere), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(serverFailure());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 1 }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledTimes(1);
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
	});

	it('says how many lines the invoice holds when it could not be put back', async () => {
		mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(invoiceRead('SENT', []));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(serverFailure());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 0 }, sending: null });
	});

	it('sends the invoice once saved, keeping an invoice already sent in its status', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: 'sent' });
		expect(mockSendInvoiceByEmail).toHaveBeenCalledWith(sending, workspace);
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});

	it('marks Sent a draft once sent, the status the save found deciding', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('DRAFT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		mockChangeInvoiceStatus.mockResolvedValue(undefined);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: 'sent' });
		expect(mockChangeInvoiceStatus).toHaveBeenCalledWith('inv-42', { status: 'SENT' }, workspace);
	});

	it('takes no status back when the draft the editor opened was sent and viewed from elsewhere since', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('VIEWED'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		mockSendInvoiceByEmail.mockResolvedValue(undefined);
		const { result } = renderSaveEdit();

		await saveWith(result, { ...sending, marksSent: true });

		expect(mockUpdateInvoice.mock.calls[0][1]).toMatchObject({ status: 'VIEWED' });
		expect(mockSendInvoiceByEmail).toHaveBeenCalledTimes(1);
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
	});

	it('sends nothing when the edit was not saved', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockRejectedValue(refusal());
		const { result } = renderSaveEdit();

		await saveWith(result, sending);

		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it.each(SWITCHED_WORKSPACES)(
		'reads and writes nothing once another tab switched the %s',
		async (_switched, cookies) => {
			mockCookieScope.organizationId = cookies.organizationId;
			mockCookieScope.tenantId = cookies.tenantId;
			const { result } = renderSaveEdit();

			const saved = await saveWith(result, sending);

			expect(saved).toEqual({ outcome: { status: 'notSaved' }, sending: null });
			expect(mockGetInvoice).not.toHaveBeenCalled();
			expect(mockUpdateInvoice).not.toHaveBeenCalled();
			expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
			expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
		}
	);

	it('writes nothing once another tab switched the workspace while the invoice was read first', async () => {
		mockGetInvoice.mockImplementation(async () => {
			mockCookieScope.organizationId = 'organization-2';
			return invoiceRead('SENT');
		});
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'notSaved' }, sending: null });
		expect(mockUpdateInvoice).not.toHaveBeenCalled();
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
	});

	it('writes its lines in the invoice’s workspace when another tab chooses another organization once the save has begun', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockImplementation(async () => {
			mockCookieScope.organizationId = 'organization-2';
		});
		mockReplaceInvoiceLines.mockResolvedValue(undefined);
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'saved' }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledWith('inv-42', edit.revision.lines, workspace);
	});

	function chooseAnotherTenant() {
		mockCookieScope.tenantId = 'tenant-2';
		mockCookieScope.accessToken = 'token-2';
	}

	it('writes nothing more in proxy mode once another tab chose another tenant after its fields were written', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockImplementation(async () => {
			mockCookieScope.tenantId = 'tenant-2';
		});
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: null }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
		expect(mockReplaceInvoiceLines).not.toHaveBeenCalled();
		expect(mockGetInvoice).toHaveBeenCalledTimes(1);
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('puts nothing back in proxy mode once another tab chose another tenant while its lines were refused', async () => {
		mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockImplementation(async () => {
			mockCookieScope.tenantId = 'tenant-2';
			throw serverFailure();
		});
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: null }, sending: null });
		expect(mockUpdateInvoice).toHaveBeenCalledTimes(1);
		expect(mockReplaceInvoiceLines).toHaveBeenCalledTimes(1);
		expect(mockGetInvoice).toHaveBeenCalledTimes(1);
	});

	function timeBilledElsewhere() {
		const message = 'INVOICE_TIME_LOG_NOT_BILLABLE: a line names a time log it cannot bill.';
		return ApiErrorService.fromAxiosError({
			message: 'Request failed with status code 400',
			status: 400,
			response: { data: { statusCode: 400, message }, headers: {}, status: 400, statusText: 'Bad Request' }
		});
	}

	it('puts its fields back and says its time was billed elsewhere when its lines are refused for that', async () => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('SENT'), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValue(undefined);
		mockReplaceInvoiceLines.mockRejectedValue(timeBilledElsewhere());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result, sending);

		expect(saved).toEqual({ outcome: { status: 'timeBilled' }, sending: null });
		expect(mockReplaceInvoiceLines).toHaveBeenCalledTimes(1);
		expect(mockUpdateInvoice).toHaveBeenLastCalledWith('inv-42', edit.previous.update, workspace);
		expect(mockSendInvoiceByEmail).not.toHaveBeenCalled();
	});

	it('says how many lines the invoice holds when, refused that way, it could not be put back', async () => {
		mockGetInvoice
			.mockResolvedValueOnce(invoiceRead('SENT'))
			.mockResolvedValue({ ...invoiceRead('SENT'), totalValue: 960 });
		mockUpdateInvoice.mockResolvedValueOnce(undefined).mockRejectedValue(serverFailure());
		mockReplaceInvoiceLines.mockRejectedValue(timeBilledElsewhere());
		const { result } = renderSaveEdit();

		const saved = await saveWith(result);

		expect(saved).toEqual({ outcome: { status: 'notPutBack', lineCount: 1 }, sending: null });
	});

	describe('in direct mode', () => {
		const pinned = { ...workspace, accessToken: 'token-1' };

		beforeEach(() => {
			mockApiAddress.value = 'https://api.test';
		});

		it('writes its lines in its tenant with the token it began with once another tab chose another tenant', async () => {
			mockGetInvoice.mockResolvedValue(invoiceRead('SENT'));
			mockUpdateInvoice.mockImplementation(async () => {
				chooseAnotherTenant();
			});
			mockReplaceInvoiceLines.mockResolvedValue(undefined);
			const { result } = renderSaveEdit();

			const saved = await saveWith(result);

			expect(saved).toEqual({ outcome: { status: 'saved' }, sending: null });
			expect(mockUpdateInvoice).toHaveBeenCalledWith('inv-42', expect.anything(), pinned);
			expect(mockReplaceInvoiceLines).toHaveBeenCalledWith('inv-42', edit.revision.lines, pinned);
		});

		it('puts the invoice back in its tenant once another tab chose another tenant while its lines were refused', async () => {
			mockGetInvoice.mockResolvedValueOnce(invoiceRead('SENT')).mockResolvedValue(invoiceRead('SENT', []));
			mockUpdateInvoice.mockResolvedValue(undefined);
			mockReplaceInvoiceLines
				.mockImplementationOnce(async () => {
					chooseAnotherTenant();
					throw serverFailure();
				})
				.mockResolvedValueOnce(undefined);
			const { result } = renderSaveEdit();

			const saved = await saveWith(result);

			expect(saved).toEqual({ outcome: { status: 'putBack' }, sending: null });
			expect(mockGetInvoice).toHaveBeenLastCalledWith('inv-42', { tenantId: 'tenant-1', accessToken: 'token-1' });
			expect(mockReplaceInvoiceLines).toHaveBeenLastCalledWith('inv-42', edit.previous.lines, pinned);
			expect(mockUpdateInvoice).toHaveBeenLastCalledWith('inv-42', edit.previous.update, pinned);
		});

		it('takes no token from a session of another tenant, and writes nothing', async () => {
			chooseAnotherTenant();
			const { result } = renderSaveEdit();

			const saved = await saveWith(result);

			expect(saved).toEqual({ outcome: { status: 'notSaved' }, sending: null });
			expect(mockGetInvoice).not.toHaveBeenCalled();
			expect(mockUpdateInvoice).not.toHaveBeenCalled();
		});
	});
});

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

	it('is not read nor marked paid from its menu', async () => {
		const queryClient = clientWithDraftListed();
		const { result } = renderWith(queryClient, () => useChangeInvoiceStatus());
		const toPaid = { invoiceId: 'inv-1', payment: 'markPaid', scope: LIST_SCOPE } as const;

		await act(async () => {
			await expect(result.current.changeStatus(toPaid)).rejects.toThrow();
		});

		expect(mockGetInvoice).not.toHaveBeenCalled();
		expect(mockChangeInvoiceStatus).not.toHaveBeenCalled();
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
