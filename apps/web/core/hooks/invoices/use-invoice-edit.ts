'use client';

import { useCallback, useMemo, useState } from 'react';
import {
	billedPreviousOf,
	billsUnrecordedTimeOf,
	hasInvoiceChanges,
	invoiceChangesOf,
	invoiceRevisionOf,
	statedLinesOf,
	type SavedInvoice
} from '@/core/lib/utils/invoice-edit';
import { parseInvoiceNumber, type InvoiceProblem } from '@/core/lib/utils/invoices';
import {
	useSaveInvoiceEdit,
	type InvoiceEdit,
	type InvoiceEditOutcome,
	type InvoiceEditToSave
} from './use-invoice-mutations';
import { useInvoiceDraft, type InvoiceDraftStart } from './use-new-invoice';

/** The API refused the edit and saved nothing: another invoice saved meanwhile may bill part of this time. */
function isRefusedEdit(outcome: InvoiceEditOutcome) {
	const isRefusedBeforeWriting = outcome.status === 'notSaved';
	const isTimeBilledElsewhere = outcome.status === 'timeBilled';
	return isRefusedBeforeWriting || isTimeBilledElsewhere;
}

function problemsOfEdit(draftProblems: InvoiceProblem[], isUnchanged: boolean): InvoiceProblem[] {
	if (!isUnchanged) {
		return draftProblems;
	}
	return [...draftProblems, 'unchanged'];
}

/** A saved invoice while it is edited on the invoice screen. Nothing reaches the API until `save` is called. */
export function useInvoiceEdit(read: SavedInvoice) {
	// As opened: a later read would move what the save compares and puts back under a draft that kept the first one
	const [saved] = useState(read);
	const start = useMemo<InvoiceDraftStart>(() => ({ kind: 'edit', saved }), [saved]);
	const draft = useInvoiceDraft(start);
	const { invoiceRequest, keptLines, descriptions, numberText, issueDay, dueDay, currency, adjustments, note } =
		draft;
	const total = draft.total;
	const billedTimeByLine = draft.time.billedTimeByLine;
	const recordsBilledTime = draft.recordsBilledTime;
	const billsUnrecordedTime = useMemo(
		() => recordsBilledTime && billsUnrecordedTimeOf(keptLines, billedTimeByLine),
		[billedTimeByLine, keptLines, recordsBilledTime]
	);
	const changes = useMemo(
		() =>
			invoiceChangesOf(saved, {
				lines: statedLinesOf(keptLines, descriptions),
				number: parseInvoiceNumber(numberText),
				issueDay,
				dueDay,
				currency,
				discountPercent: adjustments.discountPercent,
				taxPercent: adjustments.taxPercent,
				note,
				total,
				billsUnrecordedTime
			}),
		[
			adjustments,
			billsUnrecordedTime,
			currency,
			descriptions,
			dueDay,
			issueDay,
			keptLines,
			note,
			numberText,
			saved,
			total
		]
	);
	const isUnchanged = !hasInvoiceChanges(changes);
	const problems = problemsOfEdit(draft.problems, isUnchanged);
	const { saveInvoiceEdit, isSavingEdit } = useSaveInvoiceEdit();
	const deferTimeRead = draft.deferTimeRead;

	const saveEdit = useCallback(
		async (toSave: InvoiceEditToSave) => {
			const savedEdit = await saveInvoiceEdit(toSave);
			if (isRefusedEdit(savedEdit.outcome)) {
				deferTimeRead();
			}
			return savedEdit;
		},
		[deferTimeRead, saveInvoiceEdit]
	);

	const editOf = useCallback((): InvoiceEdit | null => {
		if (isUnchanged) {
			return null;
		}
		const request = invoiceRequest();
		if (!request) {
			return null;
		}
		const revision = invoiceRevisionOf(request, saved);
		const previous = billedPreviousOf(saved, billedTimeByLine, recordsBilledTime);
		return {
			invoiceId: saved.id,
			scope: saved.workspace,
			revision,
			previous,
			previousLineIds: saved.previousLineIds
		};
	}, [billedTimeByLine, invoiceRequest, isUnchanged, recordsBilledTime, saved]);

	const save = useCallback(() => {
		const edit = editOf();
		if (!edit) {
			return Promise.resolve(null);
		}
		return saveEdit({ edit, sending: null });
	}, [editOf, saveEdit]);

	/** A draft becomes Sent once it goes out; an invoice already sent keeps the status it reached. */
	const saveAndSend = useCallback(
		(email: string) => {
			const edit = editOf();
			if (!edit) {
				return Promise.resolve(null);
			}
			const invoiceNumber = edit.revision.update.invoiceNumber;
			// Sent from the invoice's workspace: a switch in another tab meanwhile sends nothing
			const sending = { invoiceId: saved.id, invoiceNumber, email, scope: edit.scope };
			return saveEdit({ edit, sending });
		},
		[editOf, saveEdit, saved]
	);

	return { ...draft, problems, changes, save, saveAndSend, isSaving: isSavingEdit };
}

export type InvoiceEditState = ReturnType<typeof useInvoiceEdit>;
