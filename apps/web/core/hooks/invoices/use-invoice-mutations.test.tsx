/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { paidChangeOf } from '@/core/lib/utils/invoice-actions';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const mockCreateInvoice = jest.fn();
const mockSendInvoiceByEmail = jest.fn();
const mockChangeInvoiceStatus = jest.fn();
const mockDeleteInvoice = jest.fn();
const mockGetInvoice = jest.fn();
const mockUpdateInvoice = jest.fn();
const mockReplaceInvoiceLines = jest.fn();

jest.mock('@/core/services/client/api/organizations/invoice.service', () => ({
	invoiceService: {
		createInvoice: (...args: unknown[]) => mockCreateInvoice(...args),
		sendInvoiceByEmail: (...args: unknown[]) => mockSendInvoiceByEmail(...args),
		changeInvoiceStatus: (...args: unknown[]) => mockChangeInvoiceStatus(...args),
		deleteInvoice: (...args: unknown[]) => mockDeleteInvoice(...args),
		getInvoice: (...args: unknown[]) => mockGetInvoice(...args),
		updateInvoice: (...args: unknown[]) => mockUpdateInvoice(...args),
		replaceInvoiceLines: (...args: unknown[]) => mockReplaceInvoiceLines(...args)
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
	useSaveInvoiceEdit,
	useSendInvoice,
	type InvoiceEdit
} from './use-invoice-mutations';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';

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
	mockDeleteInvoice.mockReset();
	mockGetInvoice.mockReset();
	mockUpdateInvoice.mockReset();
	mockReplaceInvoiceLines.mockReset();
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
		previous: { update: { ...fields, totalValue: 800 }, lines: [previousLine] }
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

	it('writes nothing more once another tab chose another tenant after its fields were written', async () => {
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

	it('puts nothing back once another tab chose another tenant while its lines were refused', async () => {
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
