'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { useNewInvoice } from '@/core/hooks/invoices/use-new-invoice';
import { useSavedInvoice } from '@/core/hooks/invoices/use-saved-invoice';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import type { SavedInvoice } from '@/core/lib/utils/invoice-edit';
import { SavedInvoiceMessage } from '../edit/saved-invoice-states';
import { replacementInvoicePathOf } from '../invoice-access-guard';
import { CancelInvoiceLink, InvoiceScreenFrame, RevisedInvoiceBody, TakeTimeAgainButton } from './invoice-screen';
import { NewInvoicePageSkeleton } from './new-invoice-states';
import { SaveInvoiceDialog } from './save-invoice-dialog';

function ReplacementNotice({ replaced }: Readonly<{ replaced: SavedInvoice }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="info"
			title={t('invoices.replace.NOTICE_TITLE', { number: String(replaced.number) })}
			description={t('invoices.replace.NOTICE_MESSAGE')}
		/>
	);
}

function ReplacementInvoiceScreen({ replaced }: Readonly<{ replaced: SavedInvoice }>) {
	const t = useTranslations();
	const locale = useLocale();
	const invoice = useNewInvoice(replaced);
	const title = t('invoices.new.TITLE');
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
	return (
		<InvoiceScreenFrame title={title} href={replacementInvoicePathOf(replaced.id)} toolbar={toolbar}>
			<RevisedInvoiceBody
				invoice={invoice}
				notice={<ReplacementNotice replaced={replaced} />}
				renderSaveDialog={(dialog) => <SaveInvoiceDialog {...dialog} invoice={invoice} />}
			/>
		</InvoiceScreenFrame>
	);
}

/** A new invoice that replaces a saved one, read first: it starts from its client, period and lines. */
export function ReplacementInvoiceContent({ invoiceId }: Readonly<{ invoiceId: string }>) {
	const t = useTranslations();
	const read = useSavedInvoice(invoiceId);
	if (read.status === 'loading') {
		return <NewInvoicePageSkeleton />;
	}
	if (read.status !== 'ready') {
		return (
			<InvoiceScreenFrame title={t('invoices.new.TITLE')} href={replacementInvoicePathOf(invoiceId)}>
				<SavedInvoiceMessage status={read.status} number={read.number} onRetry={read.retry} />
			</InvoiceScreenFrame>
		);
	}
	const replaced = read.saved;
	if (!replaced) {
		return <NewInvoicePageSkeleton />;
	}
	return <ReplacementInvoiceScreen key={replaced.id} replaced={replaced} />;
}
