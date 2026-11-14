'use client';

import { useCallback, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useChangeInvoiceStatus } from '@/core/hooks/invoices/use-invoice-mutations';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	paidChangeOf,
	unpaidChangeOf,
	type InvoiceMenuAction,
	type InvoiceStatusChange
} from '@/core/lib/utils/invoice-actions';
import type { InvoicesScope } from '@/core/services/client/api/organizations/invoice.service';
import {
	DeleteInvoiceDialog,
	SendInvoiceDialog,
	VoidAndReplaceDialog,
	VoidInvoiceDialog,
	type InvoiceActionTarget
} from './invoice-action-dialogs';

type InvoiceDialogKind = 'send' | 'void' | 'voidAndReplace' | 'delete';

interface InvoiceDialog {
	kind: InvoiceDialogKind;
	target: InvoiceActionTarget;
	/** The workspace the invoice was read in when the dialog opened: kept, so a switch while it is open refuses it. */
	scope: InvoicesScope | null;
}

/**
 * What a click on an invoice action does, wherever the invoice is shown (a row of the list, its peek, its page):
 * marking it paid or unpaid needs no confirmation and the toast says the outcome; the other actions open their
 * dialog, which keeps its invoice while it fades out.
 */
export function useInvoiceActionFlow(scope: InvoicesScope | null) {
	const t = useTranslations();
	const { changeStatus, changingIds } = useChangeInvoiceStatus();
	const [dialog, setDialog] = useState<InvoiceDialog | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const changeTo = useCallback(
		async (target: InvoiceActionTarget, change: InvoiceStatusChange, doneKey: DottedLanguageObjectStringPaths) => {
			const number = target.numberText;
			try {
				await changeStatus({ invoiceId: target.invoice.id, change, scope });
				toast.success(t(doneKey, { number }));
			} catch (error) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('invoices.actions.CHANGE_FAILED', { number }), { description: t(reasonKey) });
			}
		},
		[changeStatus, scope, t]
	);

	const takeAction = useCallback(
		(target: InvoiceActionTarget, action: InvoiceMenuAction) => {
			const total = target.invoice.totalValue;
			// Edit is a link of the menu: it never comes here.
			if (action === 'edit') {
				return;
			}
			if (action === 'markPaid') {
				void changeTo(target, paidChangeOf(total), 'invoices.actions.MARKED_PAID');
				return;
			}
			if (action === 'markUnpaid') {
				void changeTo(target, unpaidChangeOf(total), 'invoices.actions.MARKED_UNPAID');
				return;
			}
			setDialog({ kind: action, target, scope });
			setIsDialogOpen(true);
		},
		[changeTo, scope]
	);

	const closeDialog = useCallback(() => setIsDialogOpen(false), []);

	return { takeAction, changingIds, dialog, isDialogOpen, closeDialog };
}

export type InvoiceActionFlow = ReturnType<typeof useInvoiceActionFlow>;

interface InvoiceActionDialogsProps {
	flow: InvoiceActionFlow;
	/** The invoice was voided to be replaced: its replacement opens. */
	onVoided: (target: InvoiceActionTarget) => void;
	/** The draft was deleted: a peek or a page that showed it leaves it. */
	onDeleted?: (target: InvoiceActionTarget) => void;
}

export function InvoiceActionDialogs({ flow, onVoided, onDeleted }: Readonly<InvoiceActionDialogsProps>) {
	const { dialog, isDialogOpen, closeDialog } = flow;
	const target = dialog?.target ?? null;
	const scope = dialog?.scope ?? null;
	const isOpenFor = (kind: InvoiceDialogKind) => isDialogOpen && dialog?.kind === kind;
	return (
		<>
			<SendInvoiceDialog open={isOpenFor('send')} target={target} scope={scope} onClose={closeDialog} />
			<VoidInvoiceDialog open={isOpenFor('void')} target={target} scope={scope} onClose={closeDialog} />
			<VoidAndReplaceDialog
				open={isOpenFor('voidAndReplace')}
				target={target}
				scope={scope}
				onClose={closeDialog}
				onVoided={onVoided}
			/>
			<DeleteInvoiceDialog
				open={isOpenFor('delete')}
				target={target}
				scope={scope}
				onClose={closeDialog}
				onDeleted={onDeleted}
			/>
		</>
	);
}
