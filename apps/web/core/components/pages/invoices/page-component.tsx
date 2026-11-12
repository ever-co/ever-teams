'use client';

import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice } from '@/core/components/icons';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { useInvoicePdf } from '@/core/hooks/invoices/use-invoice-mutations';
import { useInvoicesQuery } from '@/core/hooks/invoices/use-invoices-query';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { InvoiceAccessGuard, INVOICES_PATH } from './invoice-access-guard';
import { InvoicesLedger } from './invoices-ledger';
import {
	InvoicesEmptyState,
	InvoicesErrorState,
	InvoicesLedgerSkeleton,
	InvoicesPageSkeleton,
	InvoicesToolbar
} from './invoices-states';

/** Mounted once the role may read invoices: nothing of an invoice is read for anyone else. */
function InvoicesContent() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const organization = useAtomValue(currentOrganizationState);
	const access = useInvoiceAccess();
	const list = useInvoicesQuery({ enabled: access.canView });
	const { downloadPdf, pendingId } = useInvoicePdf();
	const clientNames = useClientNames();

	const hasInvoices = list.invoices.length > 0;
	const showsError = list.isError && !hasInvoices;
	const isSettled = !list.isLoading && !list.isError;
	const showsEmpty = isSettled && !hasInvoices;
	const showsLedger = !list.isLoading && hasInvoices;

	const pageTitle = t('invoices.TITLE');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: pageTitle, href: INVOICES_PATH }
	];

	return (
		<PageLayout
			title={pageTitle}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Invoice aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<InvoicesToolbar total={list.total} isLoading={list.isLoading} canCreate={access.canCreate} />
			}
		>
			{list.isLoading && <InvoicesLedgerSkeleton />}
			{showsError && <InvoicesErrorState onRetry={() => void list.refetch()} />}
			{showsEmpty && <InvoicesEmptyState canCreate={access.canCreate} />}
			{showsLedger && (
				<div className="flex flex-col gap-4 pb-6">
					<InvoicesLedger
						invoices={list.invoices}
						clientNames={clientNames}
						timeZone={organization?.timeZone}
						pendingPdfId={pendingId}
						onDownload={downloadPdf}
					/>
					{list.hasMore && (
						<Button
							type="button"
							variant="outline"
							size="default"
							disabled={list.isLoadingMore}
							onClick={() => void list.loadMore()}
							className="self-center"
						>
							{t('invoices.SHOW_MORE')}
						</Button>
					)}
				</div>
			)}
		</PageLayout>
	);
}

/** The organisation (its time zone dates the invoices) is loaded through its owner hook. */
function InvoicesPage() {
	useCurrentOrganizationOwner();
	return (
		<InvoiceAccessGuard need="view" fallback={<InvoicesPageSkeleton />}>
			<InvoicesContent />
		</InvoiceAccessGuard>
	);
}

export default withAuthentication(InvoicesPage, { displayName: 'InvoicesPage', skeleton: InvoicesPageSkeleton });
