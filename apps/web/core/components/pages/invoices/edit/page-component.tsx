'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { useInvoiceEdit } from '@/core/hooks/invoices/use-invoice-edit';
import { useSavedInvoice } from '@/core/hooks/invoices/use-saved-invoice';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { invoiceRevisionsOf } from '@/core/lib/utils/invoice-actions';
import type { SavedInvoice } from '@/core/lib/utils/invoice-edit';
import { editInvoicePathOf, InvoiceAccessGuard } from '../invoice-access-guard';
import {
	CancelInvoiceLink,
	InvoiceScreenFrame,
	RevisedInvoiceBody,
	TakeTimeAgainButton,
	type SaveDialogControl
} from '../new/invoice-screen';
import { SaveInvoiceChangesDialog } from './save-invoice-changes-dialog';
import { EditInvoicePageSkeleton, LockedInvoiceMessage, SavedInvoiceMessage } from './saved-invoice-states';

interface EditInvoiceScreenProps {
	saved: SavedInvoice;
	/** A save was refused because the invoice was paid or voided since it was opened. */
	onSaveLocked: () => void;
	/** Any save that did not go through: the invoice is read again once its dialog is closed. */
	onSaveFailed: () => void;
	onSaveDialogClosed: () => void;
}

/** The invoice screen opened on a saved invoice: the same sheet and details, its title naming the invoice. */
function EditInvoiceScreen({
	saved,
	onSaveLocked,
	onSaveFailed,
	onSaveDialogClosed
}: Readonly<EditInvoiceScreenProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const invoice = useInvoiceEdit(saved);
	const title = t('invoices.edit.TITLE', { number: String(saved.number) });
	const toolbar = (
		<DashboardToolbar
			title={title}
			meta={formatPeriod(invoice.period, locale)}
			isUpdating={invoice.time.isUpdating}
			updatingLabel={t('invoices.new.UPDATING')}
			actions={<CancelInvoiceLink />}
			controls={<TakeTimeAgainButton invoice={invoice} />}
		/>
	);
	const renderSaveDialog = (dialog: SaveDialogControl) => {
		const close = () => {
			dialog.onClose();
			onSaveDialogClosed();
		};
		return (
			<SaveInvoiceChangesDialog
				open={dialog.open}
				onClose={close}
				invoice={invoice}
				onLockedRefusal={onSaveLocked}
				onSaveFailed={onSaveFailed}
			/>
		);
	};
	return (
		<InvoiceScreenFrame title={title} href={editInvoicePathOf(saved.id)} toolbar={toolbar}>
			<RevisedInvoiceBody invoice={invoice} renderSaveDialog={renderSaveDialog} />
		</InvoiceScreenFrame>
	);
}

/** Read before the screen opens: an invoice something was paid on is replaced, and a void one never changes. */
function EditInvoiceContent() {
	const t = useTranslations();
	const params = useParams<{ id: string }>();
	const invoiceId = params?.id ?? '';
	const read = useSavedInvoice(invoiceId || null);
	const [wasSaveRefused, setWasSaveRefused] = useState(false);
	const [readsAfterDialog, setReadsAfterDialog] = useState(false);
	const readAgain = read.retry;
	const markSaveRefused = useCallback(() => setWasSaveRefused(true), []);
	const markSaveFailed = useCallback(() => setReadsAfterDialog(true), []);
	// A save that did not go through leaves the invoice's read for its dialog to close: its answer may replace the
	// editor (an invoice paid meanwhile turns into the locked message), and the dialog with it.
	const readAgainAfterFailure = useCallback(() => {
		if (!readsAfterDialog && !wasSaveRefused) {
			return;
		}
		setReadsAfterDialog(false);
		readAgain();
	}, [readAgain, readsAfterDialog, wasSaveRefused]);
	const loadingTitle = t('invoices.edit.LOADING_TITLE');
	const editPath = editInvoicePathOf(invoiceId);
	if (read.status === 'loading') {
		return <EditInvoicePageSkeleton />;
	}
	if (read.status !== 'ready') {
		return (
			<InvoiceScreenFrame title={loadingTitle} href={editPath}>
				<SavedInvoiceMessage status={read.status} number={read.number} onRetry={read.retry} />
			</InvoiceScreenFrame>
		);
	}
	const saved = read.saved;
	if (!saved) {
		return <EditInvoicePageSkeleton />;
	}
	const isEditable = invoiceRevisionsOf(saved.status).includes('edit');
	if (!isEditable) {
		return (
			<InvoiceScreenFrame title={loadingTitle} href={editPath}>
				<LockedInvoiceMessage saved={saved} wasSaveRefused={wasSaveRefused} />
			</InvoiceScreenFrame>
		);
	}
	return (
		<EditInvoiceScreen
			key={saved.id}
			saved={saved}
			onSaveLocked={markSaveRefused}
			onSaveFailed={markSaveFailed}
			onSaveDialogClosed={readAgainAfterFailure}
		/>
	);
}

/** Editing rebuilds lines from everyone's time: it opens for the roles that may create invoices. */
function EditInvoicePage() {
	return (
		<InvoiceAccessGuard need="create" fallback={<EditInvoicePageSkeleton />}>
			<EditInvoiceContent />
		</InvoiceAccessGuard>
	);
}

export default withAuthentication(EditInvoicePage, {
	displayName: 'EditInvoicePage',
	skeleton: EditInvoicePageSkeleton
});
