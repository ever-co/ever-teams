'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Alert, Building, Calendar, Clock, FileText, Invoice, Mail, Pencil } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import type { InvoiceEditState } from '@/core/hooks/invoices/use-invoice-edit';
import type { InvoiceEditOutcome, SaveAndSendOutcome } from '@/core/hooks/invoices/use-invoice-mutations';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { isDraftInvoice, isInvoiceRecipient } from '@/core/lib/utils/invoice-actions';
import type { InvoiceChanges } from '@/core/lib/utils/invoice-edit';
import { formatPercent } from '@/core/lib/utils/invoice-totals';
import { invoiceDayTextOf, invoicePeriodTextOf } from '@/core/lib/utils/invoices';
import { INVOICES_PATH } from '../invoice-access-guard';
import { InvoiceRecipientField, useSentInvoiceToast } from '../invoice-sending';

type SaveMode = 'save' | 'send';

type EditFailure = Exclude<InvoiceEditOutcome, { status: 'saved' }>;

const NOT_SAVED: EditFailure = { status: 'notSaved' };

/** Long enough to be read on the list the page goes back to. */
const NOT_SENT_TOAST_MS = 10_000;

/** One row per change, the lines first, then the total and the dates: what a reader checks on an invoice. */
function useChangeRows(changes: InvoiceChanges, currency: string | null): ProjectConsequence[] {
	const t = useTranslations();
	const locale = useLocale();
	const amountText = (amount: number) => formatOwed(amount, currency, locale);
	const dayText = (day: string) => invoiceDayTextOf(day, locale) ?? day;
	const percentText = (percent: number) => formatPercent(percent, locale);
	const rows: ProjectConsequence[] = [];
	if (changes.addedLines > 0) {
		const text = t('invoices.edit.confirm.LINES_ADDED', { count: changes.addedLines });
		rows.push({ key: 'added', icon: <Clock />, text });
	}
	if (changes.removedLines > 0) {
		const text = t('invoices.edit.confirm.LINES_REMOVED', { count: changes.removedLines });
		rows.push({ key: 'removed', icon: <Clock />, text });
	}
	if (changes.repricedLines > 0) {
		const text = t('invoices.edit.confirm.LINES_CHANGED', { count: changes.repricedLines });
		rows.push({ key: 'repriced', icon: <Clock />, text });
	}
	if (changes.rewrittenDescriptions > 0) {
		const text = t('invoices.edit.confirm.DESCRIPTIONS', { count: changes.rewrittenDescriptions });
		rows.push({ key: 'descriptions', icon: <Pencil />, text });
	}
	if (changes.total) {
		const total = amountText(changes.total.after);
		const before = amountText(changes.total.before);
		const text = t('invoices.edit.confirm.TOTAL', { total, before });
		rows.push({ key: 'total', icon: <Invoice />, text });
	}
	if (changes.issueDay) {
		const date = dayText(changes.issueDay.after);
		const before = dayText(changes.issueDay.before);
		const text = t('invoices.edit.confirm.ISSUE_DATE', { date, before });
		rows.push({ key: 'issue', icon: <Calendar />, text });
	}
	if (changes.dueDay) {
		const date = dayText(changes.dueDay.after);
		const before = dayText(changes.dueDay.before);
		const text = t('invoices.edit.confirm.DUE_DATE', { date, before });
		rows.push({ key: 'due', icon: <Calendar />, text });
	}
	if (changes.number) {
		const number = String(changes.number.after);
		const before = String(changes.number.before);
		const text = t('invoices.edit.confirm.NUMBER', { number, before });
		rows.push({ key: 'number', icon: <FileText />, text });
	}
	if (changes.discount) {
		const percent = percentText(changes.discount.after);
		const before = percentText(changes.discount.before);
		const text = t('invoices.edit.confirm.DISCOUNT', { percent, before });
		rows.push({ key: 'discount', icon: <Invoice />, text });
	}
	if (changes.tax) {
		const percent = percentText(changes.tax.after);
		const before = percentText(changes.tax.before);
		const text = t('invoices.edit.confirm.TAX', { percent, before });
		rows.push({ key: 'tax', icon: <Invoice />, text });
	}
	if (changes.currency) {
		const { before, after } = changes.currency;
		const text = t('invoices.edit.confirm.CURRENCY', { currency: after, before });
		rows.push({ key: 'currency', icon: <Invoice />, text });
	}
	if (changes.isNoteRewritten) {
		rows.push({ key: 'note', icon: <FileText />, text: t('invoices.edit.confirm.NOTE') });
	}
	return rows;
}

function useFailureText(failure: EditFailure | null): string | null {
	const t = useTranslations();
	if (!failure) {
		return null;
	}
	if (failure.status === 'notSaved') {
		return t('invoices.edit.confirm.NOT_SAVED');
	}
	if (failure.status === 'putBack') {
		return t('invoices.edit.confirm.PUT_BACK');
	}
	if (failure.lineCount === null) {
		return t('invoices.edit.confirm.NOT_PUT_BACK');
	}
	return t('invoices.edit.confirm.NOT_PUT_BACK_LINES', { count: failure.lineCount });
}

/**
 * Saving an edit states what changes before anything is written. An invoice the client already has offers to send
 * this version again beside the plain save.
 */
export function SaveInvoiceChangesDialog({
	open,
	invoice,
	onClose
}: Readonly<{ open: boolean; invoice: InvoiceEditState; onClose: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const showSent = useSentInvoiceToast();
	const [failure, setFailure] = useState<EditFailure | null>(null);
	const [typedRecipient, setTypedRecipient] = useState<string | null>(null);
	const [isRecipientRefused, setIsRecipientRefused] = useState(false);
	const [runningMode, setRunningMode] = useState<SaveMode | null>(null);
	const isRunningRef = useRef(false);
	const changeRows = useChangeRows(invoice.changes, invoice.currency);
	const error = useFailureText(failure);
	const saved = invoice.savedInvoice;
	const savedNumber = String(saved?.number ?? '');
	const number = invoice.numberText.trim();
	const clientName = invoice.client?.name ?? '';
	const clientEmail = invoice.client?.primaryEmail?.trim() ?? '';
	const recipient = typedRecipient ?? clientEmail;
	const wasSent = saved !== null && !isDraftInvoice(saved.status);
	const knowsRecipient = clientEmail !== '';
	const offersSending = wasSent || knowsRecipient;
	const isBusy = invoice.isSaving || runningMode !== null;

	/** Left while the save runs, the dialog would let its answer send the user away from what they edit by then. */
	const close = () => {
		if (isBusy) {
			return;
		}
		setFailure(null);
		setTypedRecipient(null);
		setIsRecipientRefused(false);
		onClose();
	};

	/** One click saves once: a click that comes while a save runs does nothing. */
	const run = async (mode: SaveMode, task: () => Promise<void>) => {
		if (isRunningRef.current) {
			return;
		}
		isRunningRef.current = true;
		setRunningMode(mode);
		try {
			await task();
		} finally {
			isRunningRef.current = false;
			setRunningMode(null);
		}
	};

	const saveOnly = async () => {
		setFailure(null);
		const result = await invoice.save();
		if (!result) {
			setFailure(NOT_SAVED);
			return;
		}
		if (result.outcome.status !== 'saved') {
			setFailure(result.outcome);
			return;
		}
		toast.success(t('invoices.new.SAVED', { number }));
		router.push(INVOICES_PATH);
	};

	const showSending = (sending: SaveAndSendOutcome | null, email: string) => {
		const wentOut = sending !== null && sending !== 'notSent';
		if (wentOut) {
			showSent(sending, number, email);
			return;
		}
		toast.error(t('invoices.edit.SAVED_NOT_SENT', { number }), {
			description: t('invoices.new.sending.SEND_FROM_LIST'),
			duration: NOT_SENT_TOAST_MS
		});
	};

	const saveAndSend = async () => {
		setFailure(null);
		const email = recipient.trim();
		const isRecipient = isInvoiceRecipient(email);
		setIsRecipientRefused(!isRecipient);
		if (!isRecipient) {
			return;
		}
		const result = await invoice.saveAndSend(email);
		if (!result) {
			setFailure(NOT_SAVED);
			return;
		}
		if (result.outcome.status !== 'saved') {
			setFailure(result.outcome);
			return;
		}
		showSending(result.sending, email);
		router.push(INVOICES_PATH);
	};

	const changeRecipient = (email: string) => {
		setTypedRecipient(email);
		setIsRecipientRefused(false);
	};

	const consequences: ProjectConsequence[] = [
		{
			key: 'client',
			icon: <Building />,
			text: t('invoices.new.confirm.CLIENT', {
				client: clientName,
				period: invoicePeriodTextOf(invoice.periodDays, locale) ?? ''
			})
		},
		...changeRows
	];
	if (wasSent) {
		const text = t('invoices.edit.confirm.EARLIER_VERSION', { client: clientName });
		consequences.push({ key: 'earlier', icon: <Mail />, text });
	}
	if (!wasSent) {
		consequences.push({ key: 'draft', icon: <FileText />, text: t('invoices.edit.confirm.STAYS_DRAFT') });
	}
	if (offersSending) {
		let sendingText = t('invoices.new.sending.SEND_CONSEQUENCE');
		if (wasSent) {
			sendingText = t('invoices.edit.confirm.SEND_AGAIN');
		}
		consequences.push({ key: 'send', icon: <Mail />, text: sendingText });
	}
	// The save goes on without the overlap check, as it goes on despite an overlap: the person is told before saving.
	if (invoice.haveEarlierFailed) {
		consequences.push({
			key: 'unchecked',
			icon: <Alert />,
			text: t('invoices.new.confirm.UNCHECKED', { client: clientName }),
			tone: 'danger'
		});
	}

	// A read that started after the dialog opened can still change what it states: the save waits for it.
	const isWaiting = invoice.isWaiting;
	const title = t('invoices.edit.confirm.TITLE', { number: savedNumber });
	const saveLabel = t('invoices.edit.SAVE');
	const saveOnClick = () => void run('save', saveOnly);

	if (!offersSending) {
		const isSavePending = isBusy || isWaiting;
		return (
			<ProjectConfirmDialog
				open={open}
				onClose={close}
				icon={<Invoice />}
				title={title}
				consequences={consequences}
				confirmLabel={saveLabel}
				isPending={isSavePending}
				error={error}
				onConfirm={saveOnClick}
			/>
		);
	}

	let sendLabel = t('invoices.new.sending.SAVE_AND_SEND');
	if (wasSent) {
		sendLabel = t('invoices.edit.confirm.SAVE_AND_SEND_AGAIN');
	}
	const isSendPending = runningMode === 'send' || isWaiting;
	const recipientField: ReactNode = (
		<InvoiceRecipientField value={recipient} onChange={changeRecipient} isInvalid={isRecipientRefused} />
	);

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<Invoice />}
			title={title}
			consequences={consequences}
			extra={recipientField}
			confirmLabel={sendLabel}
			isPending={isSendPending}
			error={error}
			onConfirm={() => void run('send', saveAndSend)}
			secondaryAction={{ label: saveLabel, isPending: runningMode === 'save', onClick: saveOnClick }}
		/>
	);
}
