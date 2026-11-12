'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Alert, Building, Calendar, Clock, FileText, Invoice } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import {
	formatInvoiceHours,
	invoiceDayTextOf,
	invoicePeriodTextOf,
	invoiceSaveFailureOf,
	type InvoiceSaveFailure
} from '@/core/lib/utils/invoices';
import { INVOICES_PATH } from '../invoice-access-guard';

export function SaveInvoiceDialog({
	open,
	invoice,
	onClose
}: Readonly<{ open: boolean; invoice: NewInvoiceState; onClose: () => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const [failure, setFailure] = useState<InvoiceSaveFailure | null>(null);
	const number = invoice.numberText.trim();
	const clientName = invoice.client?.name ?? '';

	/** Left while the save runs, the dialog would let its answer send the user away from what they edit by then. */
	const close = () => {
		if (invoice.isSaving) {
			return;
		}
		setFailure(null);
		onClose();
	};

	const confirm = async () => {
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

	const consequences: ProjectConsequence[] = [
		{
			key: 'client',
			icon: <Building />,
			text: t('invoices.new.confirm.CLIENT', {
				client: invoice.client?.name ?? '',
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
	// The save goes on without the overlap check, as it goes on despite an overlap: the person is told before saving.
	if (invoice.haveEarlierFailed) {
		consequences.push({
			key: 'unchecked',
			icon: <Alert />,
			text: t('invoices.new.confirm.UNCHECKED', { client: invoice.client?.name ?? '' }),
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
	const isConfirmBlocked = invoice.isSaving || invoice.isWaiting;

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={close}
			icon={<Invoice />}
			title={t('invoices.new.confirm.TITLE', { number })}
			consequences={consequences}
			confirmLabel={t('invoices.new.SAVE')}
			isPending={isConfirmBlocked}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}
