'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { InvoiceDetails } from './invoice-details';
import { EarlierInvoices } from './invoice-earlier';
import { OtherCurrencies, UnpricedTimeList } from './invoice-left-out';
import { InvoiceSheet } from './invoice-sheet';
import { NEW_INVOICE_LAYOUT } from './new-invoice-recipes';
import { SaveInvoiceDialog } from './save-invoice-dialog';

export function OverlapNotice({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
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

export function PreparedInvoice({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
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
				<OverlapNotice invoice={invoice} />
				<InvoiceSheet invoice={invoice} />
				<OtherCurrencies currencies={invoice.otherCurrencies} onInvoice={invoice.changeCurrency} />
				<UnpricedTimeList items={invoice.time.unpriced} />
			</div>
			<div className="flex min-w-0 flex-col gap-4">
				<InvoiceDetails invoice={invoice} showsProblems={showsProblems} onSave={askToSave} />
				<EarlierInvoices invoice={invoice} />
			</div>
			<SaveInvoiceDialog open={isConfirming} invoice={invoice} onClose={() => setIsConfirming(false)} />
		</div>
	);
}
