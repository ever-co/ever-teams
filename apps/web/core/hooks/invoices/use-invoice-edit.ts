'use client';

import { useCallback, useMemo } from 'react';
import { isDraftInvoice } from '@/core/lib/utils/invoice-actions';
import {
	billedPreviousOf,
	hasInvoiceChanges,
	invoiceChangesOf,
	invoiceRevisionOf,
	statedLinesOf,
	type SavedInvoice
} from '@/core/lib/utils/invoice-edit';
import { parseInvoiceNumber, type InvoiceProblem } from '@/core/lib/utils/invoices';
import { useSaveInvoiceEdit, type InvoiceEdit, type InvoiceEditToSave } from './use-invoice-mutations';
import { useInvoiceDraft, type InvoiceDraftStart } from './use-new-invoice';

function problemsOfEdit(draftProblems: InvoiceProblem[], isUnchanged: boolean): InvoiceProblem[] {
	if (!isUnchanged) {
		return draftProblems;
	}
	return [...draftProblems, 'unchanged'];
}

/** A saved invoice while it is edited on the invoice screen. Nothing reaches the API until `save` is called. */
export function useInvoiceEdit(saved: SavedInvoice) {
	const start = useMemo<InvoiceDraftStart>(() => ({ kind: 'edit', saved }), [saved]);
	const draft = useInvoiceDraft(start);
	const { invoiceRequest, keptLines, descriptions, numberText, issueDay, dueDay, currency, adjustments, note } =
		draft;
	const total = draft.total;
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
				total
			}),
		[adjustments, currency, descriptions, dueDay, issueDay, keptLines, note, numberText, saved, total]
	);
	const isUnchanged = !hasInvoiceChanges(changes);
	const problems = problemsOfEdit(draft.problems, isUnchanged);
	const { saveInvoiceEdit, isSavingEdit } = useSaveInvoiceEdit();
	const billedTimeByLine = draft.time.billedTimeByLine;
	const recordsBilledTime = draft.recordsBilledTime;
	const refetchTime = draft.time.refetch;

	// Another invoice billed part of this time meanwhile: the lines are built again from what is left
	const saveEdit = useCallback(
		async (toSave: InvoiceEditToSave) => {
			const savedEdit = await saveInvoiceEdit(toSave);
			if (savedEdit.outcome.status === 'timeBilled') {
				refetchTime();
			}
			return savedEdit;
		},
		[refetchTime, saveInvoiceEdit]
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
		return { invoiceId: saved.id, scope: saved.workspace, revision, previous };
	}, [billedTimeByLine, invoiceRequest, isUnchanged, recordsBilledTime, saved]);

	const save = useCallback(async () => {
		const edit = editOf();
		if (!edit) {
			return null;
		}
		return saveEdit({ edit, sending: null });
	}, [editOf, saveEdit]);

	/** A draft becomes Sent once it goes out; an invoice already sent keeps the status it reached. */
	const saveAndSend = useCallback(
		async (email: string) => {
			const edit = editOf();
			if (!edit) {
				return null;
			}
			const invoiceNumber = edit.revision.update.invoiceNumber;
			const marksSent = isDraftInvoice(saved.status);
			// Sent from the invoice's workspace: a switch in another tab meanwhile sends nothing
			const sending = { invoiceId: saved.id, invoiceNumber, email, marksSent, scope: edit.scope };
			return saveEdit({ edit, sending });
		},
		[editOf, saveEdit, saved]
	);

	return { ...draft, problems, changes, save, saveAndSend, isSaving: isSavingEdit };
}

export type InvoiceEditState = ReturnType<typeof useInvoiceEdit>;
