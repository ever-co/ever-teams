'use client';

import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import {
	invoiceService,
	type InvoicesPage,
	type InvoicesScope,
	type InvoiceToEmail
} from '@/core/services/client/api/organizations/invoice.service';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { downloadBlob } from '@/core/lib/utils/dashboard-export';
import {
	pagesWithInvoiceChanged,
	pagesWithoutInvoice,
	SENT_CHANGE,
	type InvoiceStatusChange,
	type ListedInvoicesPage
} from '@/core/lib/utils/invoice-actions';
import type { InvoiceRequest, InvoiceStatus } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

export function useCreateInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (request: InvoiceRequest) => invoiceService.createInvoice(request),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		// A failed save may have been saved all the same: the client's invoices and the next number are read again,
		// without holding back the error until they answer.
		onError: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
		},
		meta: { handlesOwnError: true }
	});
	return { createInvoice: mutation.mutateAsync, isSaving: mutation.isPending };
}

export interface InvoiceToDownload {
	id: string;
	fileName: string;
}

export function useInvoicePdf() {
	const mutation = useMutation({
		mutationFn: async ({ id, fileName }: InvoiceToDownload) => {
			const pdf = await invoiceService.downloadInvoicePdf(id);
			downloadBlob(pdf, fileName);
		}
	});
	let pendingId: string | null = null;
	if (mutation.isPending) {
		pendingId = mutation.variables?.id ?? null;
	}
	return { downloadPdf: mutation.mutate, pendingId };
}

type InvoicesList = InfiniteData<InvoicesPage, number>;

type PagesPatch = (pages: InvoicesPage[]) => ListedInvoicesPage<TInvoice>[];

/** The workspace an invoice was read in; null when unknown, which refuses any action on it. */
type ReadWorkspace = InvoicesScope | null;

const WORKSPACE_SWITCHED = 'Another workspace was chosen since the invoice was read';

/**
 * Where an action on an invoice is made: the workspace the invoice was read in, while the cookies still name it.
 * Another tab may have switched them since; the action is then refused before any request, as a save is.
 */
function workspaceToActIn(scope: ReadWorkspace): InvoicesScope {
	if (!scope) {
		throw new Error(WORKSPACE_SWITCHED);
	}
	const isSameOrganization = getOrganizationIdCookie() === scope.organizationId;
	const isSameTenant = getTenantIdCookie() === scope.tenantId;
	const isSameWorkspace = isSameOrganization && isSameTenant;
	if (!isSameWorkspace) {
		throw new Error(WORKSPACE_SWITCHED);
	}
	return scope;
}

/** The list the invoice was read in shows what changed at once, before it is read again. */
function patchListedInvoices(queryClient: QueryClient, scope: ReadWorkspace, patch: PagesPatch) {
	if (!scope) {
		return;
	}
	const listKey = queryKeys.invoices.list(scope.tenantId, scope.organizationId);
	queryClient.setQueryData<InvoicesList>(listKey, (list) => {
		if (!list) {
			return list;
		}
		return { ...list, pages: patch(list.pages) };
	});
}

function showListedStatus(queryClient: QueryClient, scope: ReadWorkspace, invoiceId: string, status: InvoiceStatus) {
	patchListedInvoices(queryClient, scope, (pages) => pagesWithInvoiceChanged(pages, invoiceId, { status }));
}

export interface InvoiceToSend extends InvoiceToEmail {
	/** Only a draft becomes Sent: an invoice sent again keeps the status it reached since. */
	marksSent: boolean;
	scope: ReadWorkspace;
}

/** `sentNotMarked`: the e-mail went out, but the invoice could not be marked Sent. */
export type InvoiceSendOutcome = 'sent' | 'sentNotMarked';

/** E-mails the invoice, then marks a draft Sent. Throws when the sending is refused: nothing went out then. */
async function sendInvoiceToClient(target: InvoiceToSend): Promise<InvoiceSendOutcome> {
	const workspace = workspaceToActIn(target.scope);
	await invoiceService.sendInvoiceByEmail(target, workspace);
	if (!target.marksSent) {
		return 'sent';
	}
	try {
		await invoiceService.changeInvoiceStatus(target.invoiceId, SENT_CHANGE, workspace);
		return 'sent';
	} catch {
		return 'sentNotMarked';
	}
}

export function useSendInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: sendInvoiceToClient,
		onSuccess: (outcome, target) => {
			const isMarkedSent = outcome === 'sent' && target.marksSent;
			if (isMarkedSent) {
				showListedStatus(queryClient, target.scope, target.invoiceId, 'SENT');
			}
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { sendInvoice: mutation.mutateAsync, isSending: mutation.isPending };
}

export type SaveAndSendOutcome = InvoiceSendOutcome | 'notSent';

export interface SavedAndSentInvoice {
	invoice: TInvoice;
	outcome: SaveAndSendOutcome;
}

interface InvoiceToSaveAndSend {
	request: InvoiceRequest;
	email: string;
}

/** A refused sending leaves the invoice saved as a draft: it is reported, never thrown. */
async function sendSavedInvoice(target: InvoiceToSend): Promise<SaveAndSendOutcome> {
	try {
		return await sendInvoiceToClient(target);
	} catch {
		return 'notSent';
	}
}

/** Saves the invoice, then sends it. Throws only when the save is refused: nothing was created then. */
async function saveAndSendInvoice({ request, email }: InvoiceToSaveAndSend): Promise<SavedAndSentInvoice> {
	const invoice = await invoiceService.createInvoice(request);
	// Sent from the workspace it was saved in: a switch in another tab meanwhile leaves it a draft
	const scope = { organizationId: request.organizationId, tenantId: request.tenantId };
	const target = { invoiceId: invoice.id, invoiceNumber: request.invoiceNumber, email, marksSent: true, scope };
	const outcome = await sendSavedInvoice(target);
	return { invoice, outcome };
}

export function useSaveAndSendInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: saveAndSendInvoice,
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { saveAndSendInvoice: mutation.mutateAsync, isSavingAndSending: mutation.isPending };
}

export interface InvoiceStatusChangeRequest {
	invoiceId: string;
	change: InvoiceStatusChange;
	scope: ReadWorkspace;
}

async function changeStatusInItsWorkspace({ invoiceId, change, scope }: InvoiceStatusChangeRequest) {
	const workspace = workspaceToActIn(scope);
	await invoiceService.changeInvoiceStatus(invoiceId, change, workspace);
}

export function useChangeInvoiceStatus() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: changeStatusInItsWorkspace,
		onSuccess: (_answer, { invoiceId, change, scope }) =>
			showListedStatus(queryClient, scope, invoiceId, change.status),
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	let changingId: string | null = null;
	if (mutation.isPending) {
		changingId = mutation.variables?.invoiceId ?? null;
	}
	return { changeStatus: mutation.mutateAsync, isChanging: mutation.isPending, changingId };
}

interface InvoiceToDelete {
	invoiceId: string;
	scope: ReadWorkspace;
}

async function deleteInItsWorkspace({ invoiceId, scope }: InvoiceToDelete) {
	const workspace = workspaceToActIn(scope);
	await invoiceService.deleteInvoice(invoiceId, workspace);
}

export function useDeleteInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: deleteInItsWorkspace,
		onSuccess: (_answer, { invoiceId, scope }) => {
			patchListedInvoices(queryClient, scope, (pages) => pagesWithoutInvoice(pages, invoiceId));
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { deleteInvoice: mutation.mutateAsync, isDeleting: mutation.isPending };
}
