'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Alert, Building, Calendar, Clock, FileText, Invoice, Mail } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import type { SaveAndSendOutcome } from '@/core/hooks/invoices/use-invoice-mutations';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { isInvoiceRecipient } from '@/core/lib/utils/invoice-actions';
import {
	formatInvoiceHours,
	invoiceDayTextOf,
	invoicePeriodTextOf,
	invoiceSaveFailureOf,
	type InvoiceSaveFailure
} from '@/core/lib/utils/invoices';
import { INVOICES_PATH } from '../invoice-access-guard';
import { InvoiceRecipientField, useSentInvoiceToast } from '../invoice-sending';

type SaveMode = 'save' | 'send';

/** Long enough to be read on the list the page goes back to. */
const NOT_SENT_TOAST_MS = 10_000;

export function SaveInvoiceDialog({
	open,
	invoice,
	onClose
}: Readonly<{ open: boolean; invoice: NewInvoiceState; onClose: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const showSent = useSentInvoiceToast();
	const [failure, setFailure] = useState<InvoiceSaveFailure | null>(null);
	const [typedRecipient, setTypedRecipient] = useState<string | null>(null);
	const [isRecipientRefused, setIsRecipientRefused] = useState(false);
	const [runningMode, setRunningMode] = useState<SaveMode | null>(null);
	const isRunningRef = useRef(false);
	const number = invoice.numberText.trim();
	const clientName = invoice.client?.name ?? '';
	const clientEmail = invoice.client?.primaryEmail?.trim() ?? '';
	const knowsRecipient = clientEmail !== '';
	const recipient = typedRecipient ?? clientEmail;
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
		try {
			const saved = await invoice.save();
			// Nothing was sent: the invoice was not ready to be saved.
			if (!saved) {
				setFailure('refused');
				return;
			}
			toast.success(t('invoices.new.SAVED', { number }));
			router.push(INVOICES_PATH);
		} catch (error) {
			setFailure(invoiceSaveFailureOf(error));
		}
	};

	const showSending = (outcome: SaveAndSendOutcome, email: string) => {
		if (outcome !== 'notSent') {
			showSent(outcome, number, email);
			return;
		}
		toast.error(t('invoices.new.sending.SAVED_NOT_SENT', { number }), {
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
		try {
			const result = await invoice.saveAndSend(email);
			if (!result) {
				setFailure('refused');
				return;
			}
			showSending(result.outcome, email);
			router.push(INVOICES_PATH);
		} catch (error) {
			setFailure(invoiceSaveFailureOf(error));
		}
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
		{
			key: 'lines',
			icon: <Clock />,
			text: t('invoices.new.confirm.LINES', {
				count: invoice.keptLines.length,
				hours: formatInvoiceHours(invoice.keptHours, locale),
				total: formatOwed(invoice.total, invoice.currency, locale)
			})
		},
		{
			key: 'dates',
			icon: <Calendar />,
			text: t('invoices.new.confirm.DATES', {
				issueDate: invoiceDayTextOf(invoice.issueDay, locale) ?? '',
				dueDate: invoiceDayTextOf(invoice.dueDay, locale) ?? ''
			})
		},
		{ key: 'draft', icon: <FileText />, text: t('invoices.new.confirm.DRAFT') }
	];
	if (knowsRecipient) {
		consequences.push({ key: 'send', icon: <Mail />, text: t('invoices.new.sending.SEND_CONSEQUENCE') });
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

	let error: string | null = null;
	if (failure === 'refused') {
		error = t('invoices.new.confirm.FAILED');
	}
	if (failure === 'unconfirmed') {
		error = t('invoices.new.confirm.UNCONFIRMED', { client: clientName });
	}
	// A read that started after the dialog opened can still change what it states: the save waits for it.
	const isWaiting = invoice.isWaiting;

	const title = t('invoices.new.confirm.TITLE', { number });
	const saveLabel = t('invoices.new.SAVE');
	const saveOnClick = () => void run('save', saveOnly);

	if (!knowsRecipient) {
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
			confirmLabel={t('invoices.new.sending.SAVE_AND_SEND')}
			isPending={isSendPending}
			error={error}
			onConfirm={() => void run('send', saveAndSend)}
			secondaryAction={{ label: saveLabel, isPending: runningMode === 'save', onClick: saveOnClick }}
		/>
	);
}
