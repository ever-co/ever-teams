'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import type { InvoiceDraftState, InvoiceScreenState } from '@/core/hooks/invoices/use-new-invoice';
import { InvoiceDetails } from './invoice-details';
import { EarlierInvoices } from './invoice-earlier';
import { OtherCurrencies, UnpricedTimeList } from './invoice-left-out';
import { InvoiceSheet } from './invoice-sheet';
import { NEW_INVOICE_LAYOUT } from './new-invoice-recipes';

export interface SaveDialogControl {
	open: boolean;
	onClose: () => void;
}

export function OverlapNotice({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	const count = invoice.overlappingInvoices.length;
	if (count === 0) {
		return null;
	}
	return (
		<Notice
			tone="warning"
			title={t('invoices.new.earlier.OVERLAP_TITLE', { count, client: invoice.client?.name ?? '' })}
			description={t('invoices.new.earlier.OVERLAP_MESSAGE')}
		/>
	);
}

/** The invoice being prepared beside its details; the save is confirmed in the dialog of the screen it is on. */
export function PreparedInvoice({
	invoice,
	notice,
	renderSaveDialog
}: Readonly<{
	invoice: InvoiceScreenState;
	/** Above the sheet, where the overlap warning sits. */
	notice?: ReactNode;
	renderSaveDialog: (dialog: SaveDialogControl) => ReactNode;
}>) {
	const [showsProblems, setShowsProblems] = useState(false);
	const [isConfirming, setIsConfirming] = useState(false);

	const askToSave = () => {
		setShowsProblems(true);
		const isReady = invoice.problems.length === 0;
		if (isReady) {
			setIsConfirming(true);
		}
	};

	return (
		<div className={NEW_INVOICE_LAYOUT}>
			<div className="flex min-w-0 flex-col gap-4">
				{notice}
				<OverlapNotice invoice={invoice} />
				<InvoiceSheet invoice={invoice} />
				<OtherCurrencies currencies={invoice.otherCurrencies} onInvoice={invoice.changeCurrency} />
				<UnpricedTimeList items={invoice.time.unpriced} />
			</div>
			<div className="flex min-w-0 flex-col gap-4">
				<InvoiceDetails invoice={invoice} showsProblems={showsProblems} onSave={askToSave} />
				<EarlierInvoices invoice={invoice} />
			</div>
			{renderSaveDialog({ open: isConfirming, onClose: () => setIsConfirming(false) })}
		</div>
	);
}
