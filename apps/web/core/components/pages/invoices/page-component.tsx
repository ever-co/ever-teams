'use client';

import { useCallback, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice } from '@/core/components/icons';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { useChangeInvoiceStatus, useInvoicePdf } from '@/core/hooks/invoices/use-invoice-mutations';
import { useInvoicesQuery } from '@/core/hooks/invoices/use-invoices-query';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	paidChangeOf,
	unpaidChangeOf,
	type InvoiceAction,
	type InvoiceStatusChange
} from '@/core/lib/utils/invoice-actions';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import {
	DeleteInvoiceDialog,
	SendInvoiceDialog,
	VoidInvoiceDialog,
	type InvoiceActionTarget
} from './invoice-action-dialogs';
import { InvoiceAccessGuard, INVOICES_PATH } from './invoice-access-guard';
import { InvoicesLedger } from './invoices-ledger';
import {
	InvoicesEmptyState,
	InvoicesErrorState,
	InvoicesLedgerSkeleton,
	InvoicesPageSkeleton,
	InvoicesToolbar
} from './invoices-states';

type InvoiceDialogKind = 'send' | 'void' | 'delete';

interface InvoiceDialog {
	kind: InvoiceDialogKind;
	target: InvoiceActionTarget;
}

/** Marking an invoice paid or unpaid needs no confirmation: the toast says the outcome. */
function useInvoiceStatusToggle() {
	const t = useTranslations();
	const { changeStatus, changingId } = useChangeInvoiceStatus();
	const changeTo = useCallback(
		async (target: InvoiceActionTarget, change: InvoiceStatusChange, doneKey: DottedLanguageObjectStringPaths) => {
			const number = target.numberText;
			try {
				await changeStatus({ invoiceId: target.invoice.id, change });
				toast.success(t(doneKey, { number }));
			} catch (error) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('invoices.actions.CHANGE_FAILED', { number }), { description: t(reasonKey) });
			}
		},
		[changeStatus, t]
	);
	return { changeTo, changingId };
}

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
	const { changeTo, changingId } = useInvoiceStatusToggle();
	const [dialog, setDialog] = useState<InvoiceDialog | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const takeAction = useCallback(
		(target: InvoiceActionTarget, action: InvoiceAction) => {
			const total = target.invoice.totalValue;
			if (action === 'markPaid') {
				void changeTo(target, paidChangeOf(total), 'invoices.actions.MARKED_PAID');
				return;
			}
			if (action === 'markUnpaid') {
				void changeTo(target, unpaidChangeOf(total), 'invoices.actions.MARKED_UNPAID');
				return;
			}
			setDialog({ kind: action, target });
			setIsDialogOpen(true);
		},
		[changeTo]
	);

	// The dialog keeps its invoice while it fades out.
	const closeDialog = useCallback(() => setIsDialogOpen(false), []);
	const dialogTarget = dialog?.target ?? null;
	const isDialogOpenFor = (kind: InvoiceDialogKind) => isDialogOpen && dialog?.kind === kind;

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
						canEdit={access.canEdit}
						changingId={changingId}
						onAction={takeAction}
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

			<SendInvoiceDialog open={isDialogOpenFor('send')} target={dialogTarget} onClose={closeDialog} />
			<VoidInvoiceDialog open={isDialogOpenFor('void')} target={dialogTarget} onClose={closeDialog} />
			<DeleteInvoiceDialog open={isDialogOpenFor('delete')} target={dialogTarget} onClose={closeDialog} />
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
