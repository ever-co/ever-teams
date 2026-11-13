'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice } from '@/core/components/icons';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useInvoiceEdit } from '@/core/hooks/invoices/use-invoice-edit';
import { useSavedInvoice } from '@/core/hooks/invoices/use-saved-invoice';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { invoiceRevisionsOf } from '@/core/lib/utils/invoice-actions';
import type { SavedInvoice } from '@/core/lib/utils/invoice-edit';
import { isTrackingEnabledState } from '@/core/stores';
import { editInvoicePathOf, InvoiceAccessGuard, INVOICES_PATH } from '../invoice-access-guard';
import { RevisedInvoiceBody, TakeTimeAgainButton } from '../new/invoice-screen';
import { SaveInvoiceChangesDialog } from './save-invoice-changes-dialog';
import { EditInvoicePageSkeleton, LockedInvoiceMessage, SavedInvoiceMessage } from './saved-invoice-states';

function CancelLink() {
	const t = useTranslations();
	return (
		<Button asChild variant="outline" size="default">
			<Link href={INVOICES_PATH}>{t('common.CANCEL')}</Link>
		</Button>
	);
}

interface EditInvoiceFrameProps {
	invoiceId: string;
	title: string;
	toolbar?: ReactNode;
	children: ReactNode;
}

function EditInvoiceFrame({ invoiceId, title, toolbar, children }: Readonly<EditInvoiceFrameProps>) {
	const t = useTranslations();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const breadcrumbPaths = [
		{ title: t('invoices.TITLE'), href: INVOICES_PATH },
		{ title, href: editInvoicePathOf(invoiceId) }
	];
	const shownToolbar = toolbar ?? <DashboardToolbar title={title} actions={<CancelLink />} />;
	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Invoice aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={shownToolbar}
		>
			{children}
		</PageLayout>
	);
}

/** The invoice screen opened on a saved invoice: the same sheet and details, its title naming the invoice. */
function EditInvoiceScreen({ saved }: Readonly<{ saved: SavedInvoice }>) {
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
			actions={<CancelLink />}
			controls={<TakeTimeAgainButton invoice={invoice} />}
		/>
	);
	return (
		<EditInvoiceFrame invoiceId={saved.id} title={title} toolbar={toolbar}>
			<RevisedInvoiceBody
				invoice={invoice}
				renderSaveDialog={(dialog) => <SaveInvoiceChangesDialog {...dialog} invoice={invoice} />}
			/>
		</EditInvoiceFrame>
	);
}

/** Read before the screen opens: an invoice something was paid on is replaced, and a void one never changes. */
function EditInvoiceContent() {
	const t = useTranslations();
	const params = useParams<{ id: string }>();
	const invoiceId = params?.id ?? '';
	const read = useSavedInvoice(invoiceId || null);
	const loadingTitle = t('invoices.edit.LOADING_TITLE');
	if (read.status === 'loading') {
		return <EditInvoicePageSkeleton />;
	}
	if (read.status !== 'ready') {
		return (
			<EditInvoiceFrame invoiceId={invoiceId} title={loadingTitle}>
				<SavedInvoiceMessage status={read.status} number={read.number} onRetry={read.retry} />
			</EditInvoiceFrame>
		);
	}
	const saved = read.saved;
	if (!saved) {
		return <EditInvoicePageSkeleton />;
	}
	const isEditable = invoiceRevisionsOf(saved.status).includes('edit');
	if (!isEditable) {
		return (
			<EditInvoiceFrame invoiceId={invoiceId} title={loadingTitle}>
				<LockedInvoiceMessage saved={saved} />
			</EditInvoiceFrame>
		);
	}
	return <EditInvoiceScreen key={saved.id} saved={saved} />;
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
