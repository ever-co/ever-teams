'use client';

import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import {
	invoiceService,
	type InvoicesPage,
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

/** The list shows what changed at once, before it is read again. */
function patchListedInvoices(queryClient: QueryClient, patch: PagesPatch) {
	const listKey = queryKeys.invoices.list(getTenantIdCookie(), getOrganizationIdCookie());
	queryClient.setQueryData<InvoicesList>(listKey, (list) => {
		if (!list) {
			return list;
		}
		return { ...list, pages: patch(list.pages) };
	});
}

function showListedStatus(queryClient: QueryClient, invoiceId: string, status: InvoiceStatus) {
	patchListedInvoices(queryClient, (pages) => pagesWithInvoiceChanged(pages, invoiceId, { status }));
}

export interface InvoiceToSend extends InvoiceToEmail {
	/** Only a draft becomes Sent: an invoice sent again keeps the status it reached since. */
	marksSent: boolean;
}

/** `sentNotMarked`: the e-mail went out, but the invoice could not be marked Sent. */
export type InvoiceSendOutcome = 'sent' | 'sentNotMarked';

/** E-mails the invoice, then marks a draft Sent. Throws when the sending is refused: nothing went out then. */
async function sendInvoiceToClient(target: InvoiceToSend): Promise<InvoiceSendOutcome> {
	await invoiceService.sendInvoiceByEmail(target);
	if (!target.marksSent) {
		return 'sent';
	}
	try {
		await invoiceService.changeInvoiceStatus(target.invoiceId, SENT_CHANGE);
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
				showListedStatus(queryClient, target.invoiceId, 'SENT');
			}
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { sendInvoice: mutation.mutateAsync, isSending: mutation.isPending };
}

export interface InvoiceStatusChangeRequest {
	invoiceId: string;
	change: InvoiceStatusChange;
}

export function useChangeInvoiceStatus() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: ({ invoiceId, change }: InvoiceStatusChangeRequest) =>
			invoiceService.changeInvoiceStatus(invoiceId, change),
		onSuccess: (_answer, { invoiceId, change }) => showListedStatus(queryClient, invoiceId, change.status),
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	let changingId: string | null = null;
	if (mutation.isPending) {
		changingId = mutation.variables?.invoiceId ?? null;
	}
	return { changeStatus: mutation.mutateAsync, isChanging: mutation.isPending, changingId };
}

export function useDeleteInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (invoiceId: string) => invoiceService.deleteInvoice(invoiceId),
		onSuccess: (_answer, invoiceId) => {
			patchListedInvoices(queryClient, (pages) => pagesWithoutInvoice(pages, invoiceId));
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { deleteInvoice: mutation.mutateAsync, isDeleting: mutation.isPending };
}
