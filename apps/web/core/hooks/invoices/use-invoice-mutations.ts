'use client';

import { useCallback, useMemo } from 'react';
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
	type InvoiceToEmail,
	type InvoiceWriteScope
} from '@/core/services/client/api/organizations/invoice.service';
import { queryKeys } from '@/core/query/keys';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { requestAccessToken } from '@/core/lib/auth/tab-organization';
import { downloadBlob } from '@/core/lib/utils/dashboard-export';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	invoiceActionsOf,
	invoiceRevisionsOf,
	isDraftInvoice,
	paidChangeOf,
	pagesWithInvoiceChanged,
	pagesWithoutInvoice,
	SENT_CHANGE,
	unpaidChangeOf,
	VOID_CHANGE,
	type InvoiceAction,
	type InvoiceRevisingAction,
	type InvoiceStatusChange,
	type ListedInvoicesPage
} from '@/core/lib/utils/invoice-actions';
import { isTimeBilledElsewhere } from '@/core/lib/utils/invoice-billed-time';
import {
	didNotReachApi,
	haveSameFields,
	haveSameLineIds,
	haveSameLines,
	haveSameTimeLogIds,
	isRebuildableInvoice,
	type InvoiceRevision
} from '@/core/lib/utils/invoice-edit';
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

interface InvoiceToSend extends InvoiceToEmail {
	/** Only a draft becomes Sent: an invoice sent again keeps the status it reached since. */
	marksSent: boolean;
	scope: ReadWorkspace;
}

/** `sentNotMarked`: the e-mail went out, but the invoice could not be marked Sent. */
export type InvoiceSendOutcome = 'sent' | 'sentNotMarked';

interface InvoiceSending {
	outcome: InvoiceSendOutcome;
	isMarkedSent: boolean;
}

/**
 * Read again once the e-mail went out, the invoice becomes Sent only while it is still a draft: a status someone
 * reached meanwhile (paid, void) is never taken back.
 */
async function markSentWhileDraft(invoiceId: string, workspace: InvoicesScope): Promise<boolean> {
	const current = await invoiceService.getInvoiceState(invoiceId, workspace);
	const status = invoiceStatusOf(current.status);
	if (!isDraftInvoice(status)) {
		return false;
	}
	// Under the read just made: a change saved after it refuses the mark (409) rather than being written over (#5382)
	await invoiceService.changeInvoiceStatus(invoiceId, SENT_CHANGE, workspace, current.updatedAt);
	return true;
}

async function sendAndMarkSent(target: InvoiceToSend): Promise<InvoiceSending> {
	const workspace = workspaceToActIn(target.scope);
	// An e-mail cannot be taken back: an invoice voided since the dialog opened is never sent
	await assertActionOffered(target.invoiceId, 'send', workspace);
	await invoiceService.sendInvoiceByEmail(target, workspace);
	if (!target.marksSent) {
		return { outcome: 'sent', isMarkedSent: false };
	}
	try {
		const isMarkedSent = await markSentWhileDraft(target.invoiceId, workspace);
		return { outcome: 'sent', isMarkedSent };
	} catch {
		return { outcome: 'sentNotMarked', isMarkedSent: false };
	}
}

/** E-mails the invoice, then marks a draft Sent. Throws when the sending is refused: nothing went out then. */
async function sendInvoiceToClient(target: InvoiceToSend): Promise<InvoiceSendOutcome> {
	const sending = await sendAndMarkSent(target);
	return sending.outcome;
}

export function useSendInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: sendAndMarkSent,
		onSuccess: (sending, target) => {
			if (sending.isMarkedSent) {
				showListedStatus(queryClient, target.scope, target.invoiceId, 'SENT');
			}
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	const { mutateAsync } = mutation;
	const sendInvoice = useCallback(
		async (target: InvoiceToSend) => {
			const sending = await mutateAsync(target);
			return sending.outcome;
		},
		[mutateAsync]
	);
	return { sendInvoice, isSending: mutation.isPending };
}

export type SaveAndSendOutcome = InvoiceSendOutcome | 'notSent';

interface SavedAndSentInvoice {
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
	scope: InvoiceWriteScope;
	revision: InvoiceRevision;
	previous: InvoiceRevision;
	/** The ids of the lines the editor opened: lines written back after a failed save get new ones. */
	previousLineIds: ReadonlyArray<string>;
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
	/**
	 * It was saved from elsewhere after it was read for this save: the API refused the save under that read and wrote
	 * nothing (#5243). The editor opens again on what it holds now.
	 */
	| { status: 'changedMeanwhile' }
	/** It could not be read before the edit was written: nothing was written. */
	| { status: 'notChecked' }
	/** Written in part, then written back as it was. */
	| { status: 'putBack' }
	/** Its lines name time another invoice billed, or that was deleted, since it was read: it is as it was. */
	| { status: 'timeBilled' }
	/** Written in part and not written back: the invoice holds `lineCount` lines, null when it could not be read. */
	| { status: 'notPutBack'; lineCount: number | null };

async function readInvoiceBack(edit: InvoiceEdit): Promise<TSavedInvoice | null> {
	const { tenantId, accessToken } = edit.scope;
	try {
		return await invoiceService.getInvoice(edit.invoiceId, { tenantId, accessToken });
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

/**
 * Perhaps written in part, and not read back: the tenant it belongs to is no longer the one chosen, or the read
 * failed. What it holds now is unknown, so nothing is written over it.
 */
const NOT_PUT_BACK_UNREAD: InvoiceEditOutcome = { status: 'notPutBack', lineCount: null };

function isEditTenantChosen(edit: InvoiceEdit) {
	return getTenantIdCookie() === edit.scope.tenantId;
}

function callsApiDirectly() {
	return Boolean(GAUZY_API_BASE_SERVER_URL.value);
}

/**
 * The edit with the token of the session it begins in, when the browser calls the API itself: each of its requests
 * then reaches the invoice's tenant, whatever another tab chooses before the save ends. In proxy mode the route takes
 * the token from the cookies, so there is none to keep.
 */
function editPinnedToSession(edit: InvoiceEdit): InvoiceEdit {
	const isDirect = callsApiDirectly();
	const isSessionOfItsTenant = isEditTenantChosen(edit);
	const keepsToken = isDirect && isSessionOfItsTenant;
	if (!keepsToken) {
		return edit;
	}
	// This tab's token: its own for its organization while another tab has another one open (#5134)
	const scope = { ...edit.scope, accessToken: requestAccessToken() };
	return { ...edit, scope };
}

/** Whether a request of the edit still reaches its tenant: by the token it began with, or while the cookies name it. */
function reachesItsTenant(edit: InvoiceEdit) {
	const carriesItsToken = Boolean(edit.scope.accessToken);
	return carriesItsToken || isEditTenantChosen(edit);
}

/**
 * Where a write of the edit goes once it has begun. In direct mode it carries the token the save began with. In proxy
 * mode a request goes to the tenant the cookies name, whatever the edit pins, so nothing more is written once another
 * tab chose another tenant. Another organization of the same tenant leaves the request where it belongs.
 */
function scopeToWriteIn(edit: InvoiceEdit): InvoiceWriteScope {
	if (!reachesItsTenant(edit)) {
		throw new Error(TENANT_SWITCHED);
	}
	return edit.scope;
}

async function notPutBackOf(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	if (!reachesItsTenant(edit)) {
		return NOT_PUT_BACK_UNREAD;
	}
	const now = await readInvoiceBack(edit);
	return { status: 'notPutBack', lineCount: lineCountOf(now) };
}

/** Which writes of the edit were sent before it failed: the fields always go first, the lines only after them. */
type EditWritesSent = 'fields' | 'fieldsAndLines';

/**
 * Whether the invoice read back holds nothing but what it was read with and what this save may have written: the
 * status the save was written under, its fields as read or as written, and its lines as read or, once they were sent,
 * as written or deleted (the API deletes an invoice's lines before it saves the new ones). Anything else was saved
 * from elsewhere meanwhile: a payment or a void reached since is never written back over.
 */
function holdsOnlyThisSave(current: TSavedInvoice, edit: InvoiceEdit, writesSent: EditWritesSent): boolean {
	const hasStatusAsWritten = invoiceStatusOf(current.status) === invoiceStatusOf(edit.previous.update.status);
	if (!hasStatusAsWritten) {
		return false;
	}
	const hasFieldsAsRead = haveSameFields(current, edit.previous.update);
	const hasFieldsAsWritten = haveSameFields(current, edit.revision.update);
	if (!hasFieldsAsRead && !hasFieldsAsWritten) {
		return false;
	}
	const currentLines = current.invoiceItems ?? [];
	if (haveSameLines(currentLines, edit.previous.lines)) {
		return true;
	}
	// Its lines were never sent, yet they changed: they were saved from elsewhere
	if (writesSent === 'fields') {
		return false;
	}
	const hasLinesAsWritten = haveSameLines(currentLines, edit.revision.lines);
	const hasNoLines = currentLines.length === 0;
	return hasLinesAsWritten || hasNoLines;
}

/**
 * Writes the invoice back as it was read: its lines first, and only when they changed, since the API deletes the
 * lines before it saves the new ones and a failure between the two leaves none. An invoice that also holds a change
 * saved from elsewhere meanwhile is left as it is: putting back what was read would mix the old fields, the total
 * among them, with newer lines, or undo that other change.
 */
async function putInvoiceBack(edit: InvoiceEdit, writesSent: EditWritesSent): Promise<InvoiceEditOutcome> {
	if (!reachesItsTenant(edit)) {
		return NOT_PUT_BACK_UNREAD;
	}
	const current = await readInvoiceBack(edit);
	if (!current) {
		return NOT_PUT_BACK_UNREAD;
	}
	if (!holdsOnlyThisSave(current, edit, writesSent)) {
		return { status: 'notPutBack', lineCount: lineCountOf(current) };
	}
	const currentLines = current.invoiceItems ?? [];
	const putsLinesBack = !haveSameLines(currentLines, edit.previous.lines);
	const keepsItsFields = haveSameFields(current, edit.previous.update);
	// Nothing reached the invoice, as when the network failed before the first write: there is nothing to put back.
	if (!putsLinesBack && keepsItsFields) {
		return { status: 'notSaved' };
	}
	try {
		if (putsLinesBack) {
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

/**
 * Lines refused because they name time another invoice billed meanwhile: the API saved none of them, so once the
 * fields are written back the invoice is as it was.
 */
function outcomeOfRefusedLines(error: unknown, putBack: InvoiceEditOutcome): InvoiceEditOutcome {
	if (!isTimeBilledElsewhere(error)) {
		return putBack;
	}
	const isAsItWas = putBack.status === 'putBack' || putBack.status === 'notSaved';
	if (!isAsItWas) {
		return putBack;
	}
	return { status: 'timeBilled' };
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
	const hasSameLineIds = haveSameLineIds(currentLines, edit.previousLineIds);
	const hasSameFields = haveSameFields(current, edit.previous.update);
	return [hasSameLines, hasSameLineIds, hasSameFields].every(Boolean);
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
	const outcome = await putInvoiceBack(edit, 'fields');
	const isUntouched = outcome.status === 'notSaved';
	const wasNotReached = didNotReachApi(error);
	const isConnectionFailure = isUntouched && wasNotReached;
	if (isConnectionFailure) {
		return { status: 'notReached' };
	}
	return outcome;
}

/**
 * Saves an edit in the two writes an older Ever Gauzy offers: the invoice's own fields, then its lines. A refusal of
 * the first changes nothing; any other failure writes the invoice back as it was read.
 */
async function writeInvoiceEdit(edit: InvoiceEdit): Promise<InvoiceEditOutcome> {
	try {
		await invoiceService.updateInvoice(edit.invoiceId, edit.revision.update, edit.scope);
	} catch (error) {
		return outcomeOfFailedFields(edit, error);
	}
	// Lines the edit leaves as they were are not written again: the API deletes an invoice's lines before it saves the
	// new ones, and a failure between the two would cost lines nobody changed. Lines that only record the time they
	// bill are written: the API marks that time billed only when it saves them.
	const keepsItsLines =
		haveSameLines(edit.revision.lines, edit.previous.lines) &&
		haveSameTimeLogIds(edit.revision.lines, edit.previous.lines);
	if (keepsItsLines) {
		return { status: 'saved' };
	}
	try {
		const linesScope = scopeToWriteIn(edit);
		await invoiceService.replaceInvoiceLines(edit.invoiceId, edit.revision.lines, linesScope);
	} catch (error) {
		const putBack = await putInvoiceBack(edit, 'fieldsAndLines');
		return outcomeOfRefusedLines(error, putBack);
	}
	return { status: 'saved' };
}

/**
 * Gauzy's refusal of a write made under an `updatedAt` the invoice no longer holds (409 `INVOICE_CHANGED`): it wrote
 * nothing. Another 409 of the same request (time another save is billing) is a plain refusal.
 */
const INVOICE_CHANGED = 'INVOICE_CHANGED';

function isChangedMeanwhile(error: unknown): boolean {
	if (!ApiErrorService.isApiError(error)) {
		return false;
	}
	return error.hasHttpResponseStatus(409) && error.message.includes(INVOICE_CHANGED);
}

/**
 * An Ever Gauzy without `PUT /invoices/:id/with-items` (#5243) answers it as any route it does not have: 404
 * "Cannot PUT …". The route's own 404, for an invoice deleted meanwhile, names no route. A gateway that does not pass
 * the method on answers 405 or 501. Any other 404 is not read as a missing route: the two writes would then write to an
 * invoice deleted meanwhile.
 */
const MISSING_ROUTE_MESSAGE = /^cannot put\b/i;

function isSaveAtOnceMissing(error: unknown): boolean {
	if (!ApiErrorService.isApiError(error)) {
		return false;
	}
	if (error.hasHttpResponseStatus(405, 501)) {
		return true;
	}
	return error.hasHttpResponseStatus(404) && MISSING_ROUTE_MESSAGE.test(error.message);
}

/** Whether the invoice read back holds `revision`: its fields and its lines. */
function holdsRevision(current: TSavedInvoice, revision: InvoiceRevision) {
	const currentLines = current.invoiceItems ?? [];
	return haveSameFields(current, revision.update) && haveSameLines(currentLines, revision.lines);
}

/**
 * A save in one request that got no answer saying whether it went through. The API writes both or neither, and a save
 * replaces every line (new ids) and moves the invoice's `updatedAt`, so the invoice read back tells which:
 * - untouched since the read the save was made under (the same `updatedAt`; without one, the lines it was opened with,
 *   holding what was read): nothing was saved, once the API itself answered, since its answer ends its transaction.
 *   Without an answer from it (none at all, or a gateway's), the request may have been sent and still be committed
 *   after this read: what it holds is not known, and it is to be checked;
 * - its lines replaced, holding the edit: saved. The fields and the line figures alone would not tell an edit that only
 *   records the time its lines bill, since the read-back does not show which time a line bills;
 * - anything else: saved from elsewhere since, and it is checked rather than taken as this save.
 */
async function outcomeOfUnconfirmedSave(
	edit: InvoiceEdit,
	error: unknown,
	readVersion: string | null
): Promise<InvoiceEditOutcome> {
	if (!reachesItsTenant(edit)) {
		return NOT_PUT_BACK_UNREAD;
	}
	const current = await readInvoiceBack(edit);
	if (!current) {
		return NOT_PUT_BACK_UNREAD;
	}
	const currentLines = current.invoiceItems ?? [];
	const keepsItsLines = haveSameLineIds(currentLines, edit.previousLineIds);
	const isUntouched =
		readVersion === null
			? keepsItsLines && holdsRevision(current, edit.previous)
			: readVersionOf(current) === readVersion;
	if (isUntouched) {
		if (didNotReachApi(error)) {
			return NOT_PUT_BACK_UNREAD;
		}
		return { status: 'notSaved' };
	}
	if (!keepsItsLines && holdsRevision(current, edit.revision)) {
		return { status: 'saved' };
	}
	return { status: 'notPutBack', lineCount: lineCountOf(current) };
}

async function outcomeOfFailedSaveAtOnce(
	edit: InvoiceEdit,
	error: unknown,
	readVersion: string | null
): Promise<InvoiceEditOutcome> {
	if (isChangedMeanwhile(error)) {
		return { status: 'changedMeanwhile' };
	}
	const failure = invoiceSaveFailureOf(error);
	if (failure === 'timeBilled') {
		return { status: 'timeBilled' };
	}
	if (failure === 'refused') {
		return { status: 'notSaved' };
	}
	return outcomeOfUnconfirmedSave(edit, error, readVersion);
}

/**
 * Saves an edit in one request, which writes the fields and the lines together (#5243), under the `updatedAt` the
 * invoice was read with before the save: nothing is left half saved, so nothing is ever put back, and an invoice saved
 * from elsewhere after that read is refused by the API instead of written over. Null from an Ever Gauzy without that
 * request: the edit is then saved in two writes, as before (see `writeInvoiceEdit`).
 */
async function writeInvoiceEditAtOnce(
	edit: InvoiceEdit,
	readVersion: string | null
): Promise<InvoiceEditOutcome | null> {
	try {
		await invoiceService.saveInvoiceWithLines(edit.invoiceId, edit.revision, readVersion, edit.scope);
		return { status: 'saved' };
	} catch (error) {
		if (isSaveAtOnceMissing(error)) {
			return null;
		}
		return outcomeOfFailedSaveAtOnce(edit, error, readVersion);
	}
}

/**
 * Saves an edit at once where the API can, else in two writes. Any answer of the one request other than "no such route"
 * is the outcome, a refusal included: the API wrote nothing then, and two writes would only write what it refused. The
 * two writes begin only while the workspace the edit was checked in is still the chosen one, as `checkInvoiceEdit`
 * makes sure before the first request.
 */
async function saveInvoiceEditWrites(edit: InvoiceEdit, readVersion: string | null): Promise<InvoiceEditOutcome> {
	const savedAtOnce = await writeInvoiceEditAtOnce(edit, readVersion);
	if (savedAtOnce) {
		return savedAtOnce;
	}
	if (!isChosenWorkspace(edit.scope)) {
		return { status: 'notSaved' };
	}
	return writeInvoiceEdit(edit);
}

/** Why an edit is not written, or the status the invoice holds when it is and the `updatedAt` it was read at. */
type InvoiceEditCheck =
	| { refusal: InvoiceEditOutcome; status: null; readVersion: null }
	| { refusal: null; status: InvoiceStatus; readVersion: string | null };

function refusedEdit(refusal: InvoiceEditOutcome): InvoiceEditCheck {
	return { refusal, status: null, readVersion: null };
}

/** The `updatedAt` an invoice was read at, as the API states it: what a save or a status action is made under. */
function readVersionOf(invoice: Pick<TSavedInvoice, 'updatedAt'>): string | null {
	if (!invoice.updatedAt) {
		return null;
	}
	const instant = new Date(invoice.updatedAt);
	if (Number.isNaN(instant.getTime())) {
		return null;
	}
	return instant.toISOString();
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
	return { refusal: null, status, readVersion: readVersionOf(current) };
}

/** Where an edited invoice goes once saved: whether it becomes Sent is decided by the status the save finds. */
type InvoiceEditSending = Omit<InvoiceToSend, 'marksSent'>;

export interface InvoiceEditToSave {
	edit: InvoiceEdit;
	/** Where the invoice goes once saved; null saves it only. */
	sending: InvoiceEditSending | null;
}

interface SavedInvoiceEdit {
	outcome: InvoiceEditOutcome;
	/** What the sending did, when the edit was saved and was to be sent. */
	sending: SaveAndSendOutcome | null;
}

/** A refused sending leaves the edit saved: it is reported, never thrown. */
async function saveAndSendInvoiceEdit({ edit, sending }: InvoiceEditToSave): Promise<SavedInvoiceEdit> {
	const pinnedEdit = editPinnedToSession(edit);
	const check = await checkInvoiceEdit(pinnedEdit);
	if (check.status === null) {
		return { outcome: check.refusal, sending: null };
	}
	const outcome = await saveInvoiceEditWrites(editUnderStatus(pinnedEdit, check.status), check.readVersion);
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
 * Reads the invoices again after an edit. A save that did not go through leaves the editor's own read alone: its
 * answer could replace the editor (an invoice paid or voided meanwhile turns into the locked message), and the dialog
 * saying what happened to the invoice with it, before that is read. The editor reads it again once the dialog closes.
 */
function readInvoicesAfterEdit(queryClient: QueryClient, edit: InvoiceEdit, saved: SavedInvoiceEdit | undefined) {
	const hasFailed = saved !== undefined && saved.outcome.status !== 'saved';
	if (!hasFailed) {
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

/** Marking paid or unpaid: what is paid and due comes from the invoice as the API holds it when the change is made. */
export type InvoicePaymentAction = Extract<InvoiceAction, 'markPaid' | 'markUnpaid'>;

/** A change that does not depend on the invoice's amounts, such as Void, or a payment action. */
type InvoiceStatusChangeRequest =
	| { invoiceId: string; change: InvoiceStatusChange; scope: ReadWorkspace }
	| { invoiceId: string; payment: InvoicePaymentAction; scope: ReadWorkspace };

/** Shared by every row and dialog: an invoice whose status change runs stays busy, whichever change ran last. */
const STATUS_CHANGE_KEY = [...queryKeys.invoices.all, 'status-change'] as const;

function changedInvoiceIdOf(change: Mutation) {
	const request = change.state.variables as InvoiceStatusChangeRequest;
	return request.invoiceId;
}

/**
 * A status action refused because the invoice changed since it was read, with nothing written: by the check made here
 * before the write (the status no longer offers the action), or by Ever Gauzy under the `updatedAt` the action was made
 * under (409 `INVOICE_CHANGED`, #5382). Either way the invoices are read again, and the dialog or the toast says so.
 */
export function isInvoiceActionChangedMeanwhile(error: unknown): boolean {
	return error instanceof InvoiceActionWithdrawnError || isChangedMeanwhile(error);
}

/** Refused before any write: the invoice's status changed since it was listed and no longer offers the action. */
class InvoiceActionWithdrawnError extends Error {
	/** Read as a conflict: someone changed the invoice at the same time. */
	readonly status = 409;

	constructor(action: InvoiceAction | InvoiceRevisingAction) {
		super(`The invoice's current status no longer offers ${action}`);
		this.name = 'InvoiceActionWithdrawnError';
	}
}

/**
 * Refuses an action the invoice's current status no longer offers: a list or a dialog acts on the status it read, and
 * the invoice may have been sent, paid or voided since. Nothing is written once another tab switched the workspace
 * while the invoice was read.
 */
async function assertActionOffered(
	invoiceId: string,
	action: InvoiceAction,
	workspace: InvoicesScope
): Promise<string | null> {
	const current = await invoiceService.getInvoiceState(invoiceId, workspace);
	const isOffered = invoiceActionsOf(invoiceStatusOf(current.status)).includes(action);
	if (!isOffered) {
		throw new InvoiceActionWithdrawnError(action);
	}
	if (!isChosenWorkspace(workspace)) {
		throw new Error(WORKSPACE_SWITCHED);
	}
	// The `updatedAt` of this read: the action is made under it (#5382)
	return current.updatedAt;
}

/** The action a fixed change makes when the invoice's status must still offer it: Void, once paid, is refused. */
function actionOfFixedChange(change: InvoiceStatusChange): InvoiceAction | null {
	if (change.status === 'VOID') {
		return 'void';
	}
	return null;
}

/**
 * The payment change built from the invoice read now. The list's copy may be older: its total, edited elsewhere
 * since, would be saved as the amount paid or due, and its status may no longer offer the action.
 */
async function currentPaymentChangeOf(
	invoiceId: string,
	payment: InvoicePaymentAction,
	workspace: InvoicesScope
): Promise<{ change: InvoiceStatusChange; readVersion: string | null }> {
	const invoice = await invoiceService.getInvoice(invoiceId, { tenantId: workspace.tenantId });
	const status = invoiceStatusOf(invoice.status);
	const isOffered = invoiceActionsOf(status).includes(payment);
	if (!isOffered) {
		throw new InvoiceActionWithdrawnError(payment);
	}
	// The amounts come from this read, and so does the `updatedAt` the change is made under (#5382)
	const readVersion = readVersionOf(invoice);
	if (payment === 'markPaid') {
		return { change: paidChangeOf(invoice.totalValue), readVersion };
	}
	return { change: unpaidChangeOf(invoice.totalValue), readVersion };
}

/** The change made, so the list shows the status it was given. */
async function changeStatusInItsWorkspace(request: InvoiceStatusChangeRequest): Promise<InvoiceStatusChange> {
	const workspace = workspaceToActIn(request.scope);
	if ('change' in request) {
		const action = actionOfFixedChange(request.change);
		let readVersion: string | null = null;
		if (action) {
			readVersion = await assertActionOffered(request.invoiceId, action, workspace);
		}
		await invoiceService.changeInvoiceStatus(request.invoiceId, request.change, workspace, readVersion);
		return request.change;
	}
	const { change, readVersion } = await currentPaymentChangeOf(request.invoiceId, request.payment, workspace);
	// Another tab may have switched the workspace while the invoice was read: nothing is written then, and the write
	// goes to the workspace the invoice was read in
	if (!isChosenWorkspace(workspace)) {
		throw new Error(WORKSPACE_SWITCHED);
	}
	await invoiceService.changeInvoiceStatus(request.invoiceId, change, workspace, readVersion);
	return change;
}

export function useChangeInvoiceStatus() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationKey: STATUS_CHANGE_KEY,
		mutationFn: changeStatusInItsWorkspace,
		onSuccess: (change, { invoiceId, scope }) => showListedStatus(queryClient, scope, invoiceId, change.status),
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

/** `notRebuildable`: the invoice screen could not start from it, so it was left as it was. */
export type VoidToReplaceOutcome = 'voided' | 'notRebuildable';

interface InvoiceToReplace {
	invoiceId: string;
	scope: ReadWorkspace;
}

/**
 * Voids a paid invoice only once its replacement can start from it. The list does not hold its lines, so it is read
 * whole first: one the invoice screen cannot rebuild is left as it was.
 */
async function voidToReplace({ invoiceId, scope }: InvoiceToReplace): Promise<VoidToReplaceOutcome> {
	const readScope = workspaceToActIn(scope);
	const invoice = await invoiceService.getInvoice(invoiceId, { tenantId: readScope.tenantId });
	// Marked unpaid or voided since the dialog opened, it is no longer one to void and replace
	const isStillReplaceable = invoiceRevisionsOf(invoiceStatusOf(invoice.status)).includes('voidAndReplace');
	if (!isStillReplaceable) {
		throw new InvoiceActionWithdrawnError('voidAndReplace');
	}
	if (!isRebuildableInvoice(invoice)) {
		return 'notRebuildable';
	}
	// Another tab may have switched the workspace while the invoice was read
	const voidScope = workspaceToActIn(scope);
	// Under the read it was rebuilt from: a change saved since refuses the void (409) rather than being voided (#5382)
	await invoiceService.changeInvoiceStatus(invoiceId, VOID_CHANGE, voidScope, readVersionOf(invoice));
	return 'voided';
}

/** Void and replace: its row stays busy until it answers, as for any status change of the list. */
export function useVoidToReplace() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationKey: STATUS_CHANGE_KEY,
		mutationFn: voidToReplace,
		onSuccess: (outcome, { invoiceId, scope }) => {
			const isVoided = outcome === 'voided';
			if (isVoided) {
				showListedStatus(queryClient, scope, invoiceId, 'VOID');
			}
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		meta: { handlesOwnError: true }
	});
	return { voidToReplace: mutation.mutateAsync, isVoiding: mutation.isPending };
}

interface InvoiceToDelete {
	invoiceId: string;
	scope: ReadWorkspace;
}

/** Only a draft is deleted: one sent or paid since the dialog opened is refused before any request deletes it. */
async function deleteInItsWorkspace({ invoiceId, scope }: InvoiceToDelete) {
	const workspace = workspaceToActIn(scope);
	await assertActionOffered(invoiceId, 'delete', workspace);
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
