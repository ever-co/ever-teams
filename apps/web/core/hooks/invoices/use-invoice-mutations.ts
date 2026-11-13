'use client';

import { useMemo } from 'react';
import {
	hashKey,
	useMutation,
	useMutationState,
	useQueryClient,
	type InfiniteData,
	type Mutation,
	type QueryClient
} from '@tanstack/react-query';
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
	invoiceRevisionsOf,
	isDraftInvoice,
	pagesWithInvoiceChanged,
	pagesWithoutInvoice,
	SENT_CHANGE,
	type InvoiceStatusChange,
	type ListedInvoicesPage
} from '@/core/lib/utils/invoice-actions';
import { didNotReachApi, haveSameFields, haveSameLines, type InvoiceRevision } from '@/core/lib/utils/invoice-edit';
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

/** The workspace an invoice was read in; null when unknown, which refuses any action on it. */
type ReadWorkspace = InvoicesScope | null;

const WORKSPACE_SWITCHED = 'Another workspace was chosen since the invoice was read';

/** Whether the cookies still name the workspace an invoice was read in: another tab may have switched them since. */
function isChosenWorkspace(scope: InvoicesScope) {
	const isSameOrganization = getOrganizationIdCookie() === scope.organizationId;
	const isSameTenant = getTenantIdCookie() === scope.tenantId;
	return isSameOrganization && isSameTenant;
}

/**
 * Where an action on an invoice is made: the workspace the invoice was read in, while the cookies still name it.
 * Another tab may have switched them since; the action is then refused before any request, as a save is.
 */
function workspaceToActIn(scope: ReadWorkspace): InvoicesScope {
	if (!scope) {
		throw new Error(WORKSPACE_SWITCHED);
	}
	if (!isChosenWorkspace(scope)) {
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

/** An edit to save: what it writes, and the invoice as it was read, to write back if the edit fails half way. */
export interface InvoiceEdit {
	invoiceId: string;
	/** The invoice's workspace: every request of the save goes there, the ones that put it back included. */
	scope: InvoicesScope;
	revision: InvoiceRevision;
	previous: InvoiceRevision;
}

export type InvoiceEditOutcome =
	| { status: 'saved' }
	/** The API refused the edit before writing anything. */
	| { status: 'notSaved' }
	/** Its first write never reached the API, and the invoice read back is as it was. */
	| { status: 'notReached' }
	/** Something was paid on it, or it was voided, since it was opened: nothing was written. */
	| { status: 'locked' }
	/** Its fields or its lines were saved from elsewhere since it was opened: nothing was written. */
	| { status: 'changed' }
	/** It could not be read before the edit was written: nothing was written. */
	| { status: 'notChecked' }
	/** Written in part, then written back as it was. */
	| { status: 'putBack' }
	/** Written in part and not written back: the invoice holds `lineCount` lines, null when it could not be read. */
	| { status: 'notPutBack'; lineCount: number | null };

async function readInvoiceBack(edit: InvoiceEdit): Promise<TSavedInvoice | null> {
	try {
		return await invoiceService.getInvoice(edit.invoiceId, { tenantId: edit.scope.tenantId });
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

const TENANT_SWITCHED = 'Another tenant was chosen during the save';

/** Written in part, and not read back: the tenant it belongs to is no longer the one chosen. */
const NOT_PUT_BACK_UNREAD: InvoiceEditOutcome = { status: 'notPutBack', lineCount: null };

function isEditTenantChosen(edit: InvoiceEdit) {
	return getTenantIdCookie() === edit.scope.tenantId;
}

/**
 * Where a write of the edit goes once it has begun. In proxy mode a request goes to the tenant the cookies name,
 * whatever the edit pins, so nothing more is written once another tab chose another tenant. Another organization of
 * the same tenant leaves the request where it belongs.
 */
function scopeToWriteIn(edit: InvoiceEdit): InvoicesScope {
	if (!isEditTenantChosen(edit)) {
		throw new Error(TENANT_SWITCHED);
	}
	return edit.scope;
}

async function notPutBackOf(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	if (!isEditTenantChosen(edit)) {
		return NOT_PUT_BACK_UNREAD;
	}
	const now = await readInvoiceBack(edit);
	return { status: 'notPutBack', lineCount: lineCountOf(now) };
}

/**
 * Writes the invoice back as it was read: its lines first, and only when they changed, since the API deletes the
 * lines before it saves the new ones and a failure between the two leaves none.
 */
async function putInvoiceBack(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	if (!isEditTenantChosen(edit)) {
		return NOT_PUT_BACK_UNREAD;
	}
	const current = await readInvoiceBack(edit);
	const currentLines = current?.invoiceItems ?? [];
	const keepsItsLines = current !== null && haveSameLines(currentLines, edit.previous.lines);
	const keepsItsFields = current !== null && haveSameFields(current, edit.previous.update);
	// Nothing reached the invoice, as when the network failed before the first write: there is nothing to put back.
	if (keepsItsLines && keepsItsFields) {
		return { status: 'notSaved' };
	}
	try {
		if (!keepsItsLines) {
			const linesScope = scopeToWriteIn(edit);
			await invoiceService.replaceInvoiceLines(edit.invoiceId, edit.previous.lines, linesScope);
		}
		const fieldsScope = scopeToWriteIn(edit);
		await invoiceService.updateInvoice(edit.invoiceId, edit.previous.update, fieldsScope);
		return { status: 'putBack' };
	} catch {
		return notPutBackOf(edit);
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

/** Whether the invoice read before the save still states what the editor opened, its fields and its lines. */
function isAsOpened(current: TSavedInvoice, edit: InvoiceEdit) {
	const currentLines = current.invoiceItems ?? [];
	const hasSameLines = haveSameLines(currentLines, edit.previous.lines);
	const hasSameFields = haveSameFields(current, edit.previous.update);
	return hasSameLines && hasSameFields;
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

/** The first write failed: refused, it changed nothing; otherwise the invoice is read back and put back if needed. */
async function outcomeOfFailedFields(edit: InvoiceEdit, error: unknown): Promise<InvoiceEditOutcome> {
	const isRefused = invoiceSaveFailureOf(error) === 'refused';
	if (isRefused) {
		return { status: 'notSaved' };
	}
	const outcome = await putInvoiceBack(edit);
	const isUntouched = outcome.status === 'notSaved';
	const wasNotReached = didNotReachApi(error);
	const isConnectionFailure = isUntouched && wasNotReached;
	if (isConnectionFailure) {
		return { status: 'notReached' };
	}
	return outcome;
}

/**
 * Saves an edit in the two writes the API offers: the invoice's own fields, then its lines. A refusal of the first
 * changes nothing; any other failure writes the invoice back as it was read.
 */
async function writeInvoiceEdit(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	try {
		await invoiceService.updateInvoice(edit.invoiceId, edit.revision.update, edit.scope);
	} catch (error) {
		return outcomeOfFailedFields(edit, error);
	}
	try {
		const linesScope = scopeToWriteIn(edit);
		await invoiceService.replaceInvoiceLines(edit.invoiceId, edit.revision.lines, linesScope);
	} catch {
		return putInvoiceBack(edit);
	}
	return { status: 'saved' };
}

/** Why an edit is not written, or the status the invoice holds when it is. */
type InvoiceEditCheck = { refusal: InvoiceEditOutcome; status: null } | { refusal: null; status: InvoiceStatus };

function refusedEdit(refusal: InvoiceEditOutcome): InvoiceEditCheck {
	return { refusal, status: null };
}

/**
 * Reads the invoice first: a payment, a void or a change saved from elsewhere since it was opened is never written
 * over, and what a failure puts back is what was read. Nothing is written once another tab switched the workspace
 * before the first write; past it, see `scopeToWriteIn`.
 */
async function checkInvoiceEdit(edit: InvoiceEdit): Promise<InvoiceEditCheck> {
	if (!isChosenWorkspace(edit.scope)) {
		return refusedEdit({ status: 'notSaved' });
	}
	const current = await readInvoiceBack(edit);
	if (!current) {
		return refusedEdit({ status: 'notChecked' });
	}
	const status = editableStatusOf(current);
	if (!status) {
		return refusedEdit({ status: 'locked' });
	}
	if (!isAsOpened(current, edit)) {
		return refusedEdit({ status: 'changed' });
	}
	const isStillChosen = isChosenWorkspace(edit.scope);
	if (!isStillChosen) {
		return refusedEdit({ status: 'notSaved' });
	}
	return { refusal: null, status };
}

/** Where an edited invoice goes once saved: whether it becomes Sent is decided by the status the save finds. */
export type InvoiceEditSending = Omit<InvoiceToSend, 'marksSent'>;

export interface InvoiceEditToSave {
	edit: InvoiceEdit;
	/** Where the invoice goes once saved; null saves it only. */
	sending: InvoiceEditSending | null;
}

export interface SavedInvoiceEdit {
	outcome: InvoiceEditOutcome;
	/** What the sending did, when the edit was saved and was to be sent. */
	sending: SaveAndSendOutcome | null;
}

/** A refused sending leaves the edit saved: it is reported, never thrown. */
async function saveAndSendInvoiceEdit({ edit, sending }: InvoiceEditToSave): Promise<SavedInvoiceEdit> {
	const check = await checkInvoiceEdit(edit);
	if (check.status === null) {
		return { outcome: check.refusal, sending: null };
	}
	const outcome = await writeInvoiceEdit(editUnderStatus(edit, check.status));
	const isSaved = outcome.status === 'saved';
	if (!isSaved || !sending) {
		return { outcome, sending: null };
	}
	// Only a draft becomes Sent: one sent from elsewhere since the editor opened keeps the status it reached
	const marksSent = isDraftInvoice(check.status);
	const sendingOutcome = await sendSavedInvoice({ ...sending, marksSent });
	return { outcome, sending: sendingOutcome };
}

/**
 * Reads the invoices again after an edit. A refusal because the invoice was paid or voided since it was opened leaves
 * the editor's own read alone: its answer would replace the editor, and the refusal with it, before it is read.
 */
function readInvoicesAfterEdit(queryClient: QueryClient, edit: InvoiceEdit, saved: SavedInvoiceEdit | undefined) {
	const isLocked = saved?.outcome.status === 'locked';
	if (!isLocked) {
		return queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
	}
	const editorRead = queryKeys.invoices.detail(edit.scope.tenantId, edit.scope.organizationId, edit.invoiceId);
	const editorReadHash = hashKey(editorRead);
	return queryClient.invalidateQueries({
		queryKey: queryKeys.invoices.all,
		predicate: (query) => query.queryHash !== editorReadHash
	});
}

export function useSaveInvoiceEdit() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: saveAndSendInvoiceEdit,
		onSettled: (saved, _error, { edit }) => readInvoicesAfterEdit(queryClient, edit, saved),
		meta: { handlesOwnError: true }
	});
	return { saveInvoiceEdit: mutation.mutateAsync, isSavingEdit: mutation.isPending };
}

export interface InvoiceStatusChangeRequest {
	invoiceId: string;
	change: InvoiceStatusChange;
	scope: ReadWorkspace;
}

/** Shared by every row and dialog: an invoice whose status change runs stays busy, whichever change ran last. */
const STATUS_CHANGE_KEY = [...queryKeys.invoices.all, 'status-change'] as const;

function changedInvoiceIdOf(change: Mutation) {
	const request = change.state.variables as InvoiceStatusChangeRequest;
	return request.invoiceId;
}

async function changeStatusInItsWorkspace({ invoiceId, change, scope }: InvoiceStatusChangeRequest) {
	const workspace = workspaceToActIn(scope);
	await invoiceService.changeInvoiceStatus(invoiceId, change, workspace);
}

export function useChangeInvoiceStatus() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationKey: STATUS_CHANGE_KEY,
		mutationFn: changeStatusInItsWorkspace,
		onSuccess: (_answer, { invoiceId, change, scope }) =>
			showListedStatus(queryClient, scope, invoiceId, change.status),
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	const pendingIds = useMutationState({
		filters: { mutationKey: STATUS_CHANGE_KEY, status: 'pending' },
		select: changedInvoiceIdOf
	});
	const changingIds = useMemo<ReadonlySet<string>>(() => new Set(pendingIds), [pendingIds]);
	return { changeStatus: mutation.mutateAsync, isChanging: mutation.isPending, changingIds };
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
