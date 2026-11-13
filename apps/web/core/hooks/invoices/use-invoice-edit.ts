'use client';

import { useCallback, useMemo } from 'react';
import { isDraftInvoice } from '@/core/lib/utils/invoice-actions';
import {
	hasInvoiceChanges,
	invoiceChangesOf,
	invoiceRevisionOf,
	statedLinesOf,
	type SavedInvoice
} from '@/core/lib/utils/invoice-edit';
import { parseInvoiceNumber, type InvoiceProblem } from '@/core/lib/utils/invoices';
import { useSaveInvoiceEdit, type InvoiceEdit } from './use-invoice-mutations';
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

	const editOf = useCallback((): InvoiceEdit | null => {
		if (isUnchanged) {
			return null;
		}
		const request = invoiceRequest();
		if (!request) {
			return null;
		}
		const revision = invoiceRevisionOf(request, saved);
		return { invoiceId: saved.id, revision, previous: saved.previous };
	}, [invoiceRequest, isUnchanged, saved]);

	const save = useCallback(async () => {
		const edit = editOf();
		if (!edit) {
			return null;
		}
		return saveInvoiceEdit({ edit, sending: null });
	}, [editOf, saveInvoiceEdit]);

	/** A draft becomes Sent once it goes out; an invoice already sent keeps the status it reached. */
	const saveAndSend = useCallback(
		async (email: string) => {
			const edit = editOf();
			if (!edit) {
				return null;
			}
			const invoiceNumber = edit.revision.update.invoiceNumber;
			const marksSent = isDraftInvoice(saved.status);
			const sending = { invoiceId: saved.id, invoiceNumber, email, marksSent };
			return saveInvoiceEdit({ edit, sending });
		},
		[editOf, saveInvoiceEdit, saved]
	);

	return { ...draft, problems, changes, save, saveAndSend, isSaving: isSavingEdit };
}

export type InvoiceEditState = ReturnType<typeof useInvoiceEdit>;
