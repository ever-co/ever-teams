'use client';

import { useCallback, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Alert, CircleX, FileText, Invoice, Mail, Refresh, Send, Trash } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useDeleteInvoice, useChangeInvoiceStatus, useSendInvoice } from '@/core/hooks/invoices/use-invoice-mutations';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { isDraftInvoice, isInvoiceRecipient, VOID_CHANGE } from '@/core/lib/utils/invoice-actions';
import { invoiceStatusOf } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import { InvoiceRecipientField, useSentInvoiceToast } from './invoice-sending';

export interface InvoiceActionTarget {
	invoice: TInvoice;
	numberText: string;
	clientName: string;
}

interface InvoiceActionDialogProps {
	open: boolean;
	target: InvoiceActionTarget | null;
	onClose: () => void;
}

/** One click runs once: a click that comes while the request runs does nothing. */
function useSingleRun() {
	const isRunningRef = useRef(false);
	return useCallback(async (task: () => Promise<void>) => {
		if (isRunningRef.current) {
			return;
		}
		isRunningRef.current = true;
		try {
			await task();
		} finally {
			isRunningRef.current = false;
		}
	}, []);
}

function InvoiceSubject({ target }: Readonly<{ target: InvoiceActionTarget }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { invoice, numberText, clientName } = target;
	const total = invoice.totalValue;
	let figures: string = t('invoices.NUMBER', { number: numberText });
	if (typeof total === 'number') {
		const totalText = formatOwed(total, invoice.currency ?? null, locale);
		figures = `${figures} · ${totalText}`;
	}
	return (
		<div className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 hairline-ring ring-border shadow-sm shadow-black/6.5">
			<EntityTile name={clientName} imageUrl={invoice.toContact?.imageUrl} className="size-8 text-[11px]" />
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{clientName}</span>
				<span className="truncate text-xs tabular-nums text-muted-foreground">{figures}</span>
			</span>
		</div>
	);
}

function subjectOf(target: InvoiceActionTarget | null) {
	if (!target) {
		return null;
	}
	return <InvoiceSubject target={target} />;
}

export function SendInvoiceDialog({ open, target, onClose }: Readonly<InvoiceActionDialogProps>) {
	const t = useTranslations();
	const { sendInvoice, isSending } = useSendInvoice();
	const showSent = useSentInvoiceToast();
	const runOnce = useSingleRun();
	const [typedRecipient, setTypedRecipient] = useState<string | null>(null);
	const [isRecipientRefused, setIsRecipientRefused] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);
	const numberText = target?.numberText ?? '';
	const clientEmail = target?.invoice.toContact?.primaryEmail?.trim() ?? '';
	const recipient = typedRecipient ?? clientEmail;
	const marksSent = isDraftInvoice(invoiceStatusOf(target?.invoice.status));

	const reset = () => {
		setTypedRecipient(null);
		setIsRecipientRefused(false);
		setHasFailed(false);
	};

	const close = () => {
		if (isSending) {
			return;
		}
		reset();
		onClose();
	};

	const send = async () => {
		if (!target) {
			return;
		}
		const email = recipient.trim();
		const isRecipient = isInvoiceRecipient(email);
		setIsRecipientRefused(!isRecipient);
		if (!isRecipient) {
			return;
		}
		setHasFailed(false);
		const invoiceNumber = target.invoice.invoiceNumber ?? null;
		try {
			const outcome = await sendInvoice({ invoiceId: target.invoice.id, invoiceNumber, email, marksSent });
			showSent(outcome, numberText, email);
			reset();
			onClose();
		} catch {
			setHasFailed(true);
		}
	};

	const changeRecipient = (email: string) => {
		setTypedRecipient(email);
		setIsRecipientRefused(false);
	};

	const consequences: ProjectConsequence[] = [{ key: 'attached', icon: <Mail />, text: t('invoices.send.ATTACHED') }];
	if (marksSent) {
		consequences.push({ key: 'sent', icon: <Send />, text: t('invoices.send.MARKS_SENT') });
	}
	let error: string | null = null;
	if (hasFailed) {
		error = t('invoices.send.FAILED', { number: numberText });
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<Send />}
			title={t('invoices.send.TITLE', { number: numberText })}
			subject={subjectOf(target)}
			consequences={consequences}
			extra={
				<InvoiceRecipientField value={recipient} onChange={changeRecipient} isInvalid={isRecipientRefused} />
			}
			confirmLabel={t('invoices.send.CONFIRM')}
			isPending={isSending}
			error={error}
			onConfirm={() => void runOnce(send)}
		/>
	);
}

export function VoidInvoiceDialog({ open, target, onClose }: Readonly<InvoiceActionDialogProps>) {
	const t = useTranslations();
	const { changeStatus, isChanging } = useChangeInvoiceStatus();
	const runOnce = useSingleRun();
	const [hasFailed, setHasFailed] = useState(false);
	const numberText = target?.numberText ?? '';

	const close = () => {
		if (isChanging) {
			return;
		}
		setHasFailed(false);
		onClose();
	};

	const voidInvoice = async () => {
		if (!target) {
			return;
		}
		setHasFailed(false);
		try {
			await changeStatus({ invoiceId: target.invoice.id, change: VOID_CHANGE });
			toast.success(t('invoices.void.DONE', { number: numberText }));
			onClose();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'listed', icon: <FileText />, text: t('invoices.void.STAYS_LISTED') },
		{ key: 'final', icon: <CircleX />, text: t('invoices.void.FINAL'), tone: 'danger' }
	];
	let error: string | null = null;
	if (hasFailed) {
		error = t('invoices.void.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<CircleX />}
			tone="danger"
			title={t('invoices.void.TITLE', { number: numberText })}
			subject={subjectOf(target)}
			consequences={consequences}
			confirmLabel={t('invoices.void.CONFIRM')}
			isPending={isChanging}
			error={error}
			onConfirm={() => void runOnce(voidInvoice)}
		/>
	);
}

export function DeleteInvoiceDialog({ open, target, onClose }: Readonly<InvoiceActionDialogProps>) {
	const t = useTranslations();
	const { deleteInvoice, isDeleting } = useDeleteInvoice();
	const runOnce = useSingleRun();
	const [hasFailed, setHasFailed] = useState(false);
	const numberText = target?.numberText ?? '';

	const close = () => {
		if (isDeleting) {
			return;
		}
		setHasFailed(false);
		onClose();
	};

	const remove = async () => {
		if (!target) {
			return;
		}
		setHasFailed(false);
		try {
			await deleteInvoice(target.invoice.id);
			toast.success(t('invoices.delete.DONE', { number: numberText }));
			onClose();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'gone', icon: <Trash />, text: t('invoices.delete.FOR_GOOD'), tone: 'danger' },
		{ key: 'number', icon: <Invoice />, text: t('invoices.delete.NUMBER_FREE') }
	];
	let error: string | null = null;
	if (hasFailed) {
		error = t('invoices.delete.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<Trash />}
			tone="danger"
			title={t('invoices.delete.TITLE', { number: numberText })}
			subject={subjectOf(target)}
			consequences={consequences}
			confirmLabel={t('invoices.delete.CONFIRM')}
			isPending={isDeleting}
			error={error}
			onConfirm={() => void runOnce(remove)}
		/>
	);
}

/**
 * A paid invoice is never changed: it is voided, and a new invoice bills the same time instead. The new one is made
 * on the screen `onVoided` opens; left unsaved, the paid invoice stays void, which the dialog says beforehand.
 */
export function VoidAndReplaceDialog({
	open,
	target,
	onClose,
	onVoided
}: Readonly<InvoiceActionDialogProps & { onVoided: (target: InvoiceActionTarget) => void }>) {
	const t = useTranslations();
	const { changeStatus, isChanging } = useChangeInvoiceStatus();
	const runOnce = useSingleRun();
	const [hasFailed, setHasFailed] = useState(false);
	const numberText = target?.numberText ?? '';
	const clientName = target?.clientName ?? '';

	const close = () => {
		if (isChanging) {
			return;
		}
		setHasFailed(false);
		onClose();
	};

	const voidAndReplace = async () => {
		if (!target) {
			return;
		}
		setHasFailed(false);
		try {
			await changeStatus({ invoiceId: target.invoice.id, change: VOID_CHANGE });
		} catch {
			setHasFailed(true);
			return;
		}
		toast.success(t('invoices.void.DONE', { number: numberText }));
		onClose();
		onVoided(target);
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'voids', icon: <FileText />, text: t('invoices.replace.VOIDS') },
		{ key: 'opens', icon: <Invoice />, text: t('invoices.replace.OPENS', { client: clientName }) },
		{
			key: 'stays',
			icon: <Alert />,
			text: t('invoices.replace.STAYS_VOID', { number: numberText }),
			tone: 'danger'
		}
	];
	let error: string | null = null;
	if (hasFailed) {
		error = t('invoices.void.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<Refresh />}
			tone="danger"
			title={t('invoices.replace.TITLE', { number: numberText })}
			subject={subjectOf(target)}
			consequences={consequences}
			confirmLabel={t('invoices.replace.CONFIRM')}
			isPending={isChanging}
			error={error}
			onConfirm={() => void runOnce(voidAndReplace)}
		/>
	);
}
