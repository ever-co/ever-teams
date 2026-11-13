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
	invoiceRevisionsOf,
	pagesWithInvoiceChanged,
	pagesWithoutInvoice,
	SENT_CHANGE,
	type InvoiceStatusChange,
	type ListedInvoicesPage
} from '@/core/lib/utils/invoice-actions';
import { haveSameLines, type InvoiceRevision } from '@/core/lib/utils/invoice-edit';
import {
	invoiceSaveFailureOf,
	invoiceStatusOf,
	type InvoiceRequest,
	type InvoiceStatus
} from '@/core/lib/utils/invoices';
import type { TInvoice, TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';

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
	const target = { invoiceId: invoice.id, invoiceNumber: request.invoiceNumber, email, marksSent: true };
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

/** An edit to save: what it writes, and the invoice as it was read, to write back if the edit fails half way. */
export interface InvoiceEdit {
	invoiceId: string;
	revision: InvoiceRevision;
	previous: InvoiceRevision;
}

export type InvoiceEditOutcome =
	| { status: 'saved' }
	/** The API refused the edit before writing anything. */
	| { status: 'notSaved' }
	/** Something was paid on it, or it was voided, since it was opened: nothing was written. */
	| { status: 'locked' }
	/** It could not be read before the edit was written: nothing was written. */
	| { status: 'notChecked' }
	/** Written in part, then written back as it was. */
	| { status: 'putBack' }
	/** Written in part and not written back: the invoice holds `lineCount` lines, null when it could not be read. */
	| { status: 'notPutBack'; lineCount: number | null };

async function readInvoiceBack(invoiceId: string): Promise<TSavedInvoice | null> {
	try {
		return await invoiceService.getInvoice(invoiceId);
	} catch {
		return null;
	}
}

function lineCountOf(invoice: TSavedInvoice | null): number | null {
	if (!invoice) {
		return null;
	}
	return invoice.invoiceItems?.length ?? 0;
}

/**
 * Writes the invoice back as it was read: its lines first, and only when they changed, since the API deletes the
 * lines before it saves the new ones and a failure between the two leaves none.
 */
async function putInvoiceBack(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	const current = await readInvoiceBack(edit.invoiceId);
	const currentLines = current?.invoiceItems ?? [];
	const keepsItsLines = current !== null && haveSameLines(currentLines, edit.previous.lines);
	try {
		if (!keepsItsLines) {
			await invoiceService.replaceInvoiceLines(edit.invoiceId, edit.previous.lines);
		}
		await invoiceService.updateInvoice(edit.invoiceId, edit.previous.update);
		return { status: 'putBack' };
	} catch {
		const now = await readInvoiceBack(edit.invoiceId);
		return { status: 'notPutBack', lineCount: lineCountOf(now) };
	}
}

/** The status the invoice holds now, while it still lets an edit through. */
function editableStatusOf(invoice: TSavedInvoice): InvoiceStatus | null {
	const status = invoiceStatusOf(invoice.status);
	if (!status) {
		return null;
	}
	const isEditable = invoiceRevisionsOf(status).includes('edit');
	if (!isEditable) {
		return null;
	}
	return status;
}

/** The edit written under the status the invoice holds now: a status reached since it was opened stays. */
function editUnderStatus(edit: InvoiceEdit, status: InvoiceStatus): InvoiceEdit {
	const update = { ...edit.revision.update, status };
	const previousUpdate = { ...edit.previous.update, status };
	return {
		...edit,
		revision: { ...edit.revision, update },
		previous: { ...edit.previous, update: previousUpdate }
	};
}

/**
 * Saves an edit in the two writes the API offers: the invoice's own fields, then its lines. A refusal of the first
 * changes nothing; any other failure writes the invoice back as it was read.
 */
async function writeInvoiceEdit(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	try {
		await invoiceService.updateInvoice(edit.invoiceId, edit.revision.update);
	} catch (error) {
		const isRefused = invoiceSaveFailureOf(error) === 'refused';
		if (isRefused) {
			return { status: 'notSaved' };
		}
		return putInvoiceBack(edit);
	}
	try {
		await invoiceService.replaceInvoiceLines(edit.invoiceId, edit.revision.lines);
	} catch {
		return putInvoiceBack(edit);
	}
	return { status: 'saved' };
}

/** Reads the invoice first: a payment or a void recorded since it was opened is never written over. */
async function saveInvoiceEdit(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	const current = await readInvoiceBack(edit.invoiceId);
	if (!current) {
		return { status: 'notChecked' };
	}
	const status = editableStatusOf(current);
	if (!status) {
		return { status: 'locked' };
	}
	return writeInvoiceEdit(editUnderStatus(edit, status));
}

export interface InvoiceEditToSave {
	edit: InvoiceEdit;
	/** Where the invoice goes once saved; null saves it only. */
	sending: InvoiceToSend | null;
}

export interface SavedInvoiceEdit {
	outcome: InvoiceEditOutcome;
	/** What the sending did, when the edit was saved and was to be sent. */
	sending: SaveAndSendOutcome | null;
}

/** A refused sending leaves the edit saved: it is reported, never thrown. */
async function saveAndSendInvoiceEdit({ edit, sending }: InvoiceEditToSave): Promise<SavedInvoiceEdit> {
	const outcome = await saveInvoiceEdit(edit);
	const isSaved = outcome.status === 'saved';
	if (!isSaved || !sending) {
		return { outcome, sending: null };
	}
	const sendingOutcome = await sendSavedInvoice(sending);
	return { outcome, sending: sendingOutcome };
}

export function useSaveInvoiceEdit() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: saveAndSendInvoiceEdit,
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { saveInvoiceEdit: mutation.mutateAsync, isSavingEdit: mutation.isPending };
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
