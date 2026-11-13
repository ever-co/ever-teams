'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { Invoice } from '@/core/components/icons';
import { InvoiceMoneyBand, InvoiceMoneyBandSkeleton } from '@/core/components/invoices/invoice-money-band';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { useInvoicePdf } from '@/core/hooks/invoices/use-invoice-mutations';
import { useInvoicesOverview } from '@/core/hooks/invoices/use-invoices-overview';
import { useLedgerStanding } from '@/core/hooks/invoices/use-ledger-standing';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { InvoiceActionTarget } from './invoice-action-dialogs';
import { InvoiceActionDialogs, useInvoiceActionFlow } from './invoice-action-flow';
import { InvoiceAccessGuard, INVOICES_PATH, replacementInvoicePathOf } from './invoice-access-guard';
import { InvoicesLedger } from './invoices-ledger';
import {
	InvoicesEmptyState,
	InvoicesErrorState,
	InvoicesFilterEmptyState,
	InvoicesLedgerSkeleton,
	InvoicesPageSkeleton,
	InvoicesToolbar
} from './invoices-states';

/** Mounted once the role may read invoices: nothing of an invoice is read for anyone else. */
function InvoicesContent() {
	const t = useTranslations();
	const router = useRouter();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const access = useInvoiceAccess();
	const { filter, setFilter } = useLedgerStanding();
	const overview = useInvoicesOverview({ enabled: access.canView, filter });
	const { list, liveSummary } = overview;
	const { downloadPdf, pendingId } = useInvoicePdf();
	const clientNames = useClientNames();
	const actionFlow = useInvoiceActionFlow(list.scope);

	const openReplacement = useCallback(
		(target: InvoiceActionTarget) => {
			const replacementPath = replacementInvoicePathOf(target.invoice.id);
			router.push(replacementPath);
		},
		[router]
	);

	const hasInvoices = list.invoices.length > 0;
	const showsError = list.isError && !hasInvoices;
	const isSettled = !list.isLoading && !list.isError;
	const showsEmpty = isSettled && !hasInvoices;
	const showsBody = !list.isLoading && hasInvoices;
	// Drafts, Open and Overdue list the invoices read whole: until that read arrives they have no rows to show
	const isWaitingForWhole = overview.isFilterWhole && !liveSummary;
	const hasRows = overview.rows.length > 0;
	const isRowsKnown = showsBody && !isWaitingForWhole;
	const showsRows = isRowsKnown && hasRows;
	const showsFilterEmpty = isRowsKnown && !hasRows;
	const showsBand = showsBody && liveSummary !== null;
	const showsBandSkeleton = showsBody && overview.isLiveLoading;
	const showsLiveError = showsBody && overview.hasLiveFailed;
	const showsRowsSkeleton = showsBandSkeleton && overview.isFilterWhole;
	const showsMore = showsBody && list.hasMore && !overview.isFilterWhole;
	const isFiltered = filter !== 'all';
	const showsLoadedOnly = showsRows && overview.mayHoldMore && isFiltered;
	const showAll = useCallback(() => setFilter('all'), [setFilter]);
	let ledgerFilter;
	if (hasInvoices) {
		ledgerFilter = { filter, counts: overview.counts, onFilterChange: setFilter };
	}

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
				<InvoicesToolbar
					total={list.total}
					isLoading={list.isLoading}
					canCreate={access.canCreate}
					ledgerFilter={ledgerFilter}
				/>
			}
		>
			{list.isLoading && <InvoicesLedgerSkeleton />}
			{showsError && <InvoicesErrorState onRetry={() => void list.refetch()} />}
			{showsEmpty && <InvoicesEmptyState canCreate={access.canCreate} />}
			{showsBody && (
				<div className="flex flex-col gap-5 pb-6">
					{showsBand && liveSummary && (
						<InvoiceMoneyBand summary={liveSummary} picked={filter} onPick={setFilter} />
					)}
					{showsBandSkeleton && <InvoiceMoneyBandSkeleton />}
					{showsLiveError && (
						<DashboardErrorNotice
							title={t('invoices.money.ERROR')}
							onRetry={() => void overview.refetchLive()}
						/>
					)}
					{showsRowsSkeleton && <InvoicesLedgerSkeleton />}
					{showsRows && (
						<InvoicesLedger
							invoices={overview.rows}
							clientNames={clientNames}
							timeZone={overview.timeZone}
							todayKey={overview.todayKey}
							pendingPdfId={pendingId}
							onDownload={downloadPdf}
							canEdit={access.canEdit}
							changingIds={actionFlow.changingIds}
							onAction={actionFlow.takeAction}
							canRevise={access.canCreate}
						/>
					)}
					{showsFilterEmpty && <InvoicesFilterEmptyState filter={filter} onShowAll={showAll} />}
					{showsLoadedOnly && (
						<p className="px-1 text-xs text-muted-foreground">
							{t('invoices.filter.LOADED_ONLY', { count: list.invoices.length })}
						</p>
					)}
					{showsMore && (
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

			<InvoiceActionDialogs flow={actionFlow} onVoided={openReplacement} />
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
