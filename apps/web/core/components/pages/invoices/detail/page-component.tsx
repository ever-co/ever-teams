'use client';

import { useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { Invoice } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { useInvoiceClock } from '@/core/hooks/invoices/use-invoice-clock';
import { useInvoicePdf } from '@/core/hooks/invoices/use-invoice-mutations';
import { useInvoiceQuery } from '@/core/hooks/invoices/use-invoices-query';
import { isInvoiceOfWorkspace } from '@/core/lib/utils/invoice-edit';
import type { InvoiceMenuAction } from '@/core/lib/utils/invoice-actions';
import { invoiceClientNameOf, invoiceNumberTextOf, invoicePdfFileNameOf } from '@/core/lib/utils/invoice-labels';
import { invoicePagePathOf } from '@/core/lib/utils/invoice-paths';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';
import type { InvoiceActionTarget } from '../invoice-action-dialogs';
import { InvoiceActionDialogs, useInvoiceActionFlow } from '../invoice-action-flow';
import { InvoiceAccessGuard, INVOICES_PATH, replacementInvoicePathOf } from '../invoice-access-guard';
import { InvoiceDetailHeader } from './invoice-detail-header';
import { InvoiceDetailPaper } from './invoice-detail-paper';
import {
	InvoiceDetailBodySkeleton,
	InvoiceDetailHeaderSkeleton,
	InvoiceDetailPageSkeleton
} from './invoice-detail-skeleton';

/** The read of the organization whose time zone dates the invoice and whose name signs it. */
interface OrganizationRead {
	isError: boolean;
	refetch: () => unknown;
}

/** Mounted once the role may read invoices: nothing of an invoice is read for anyone else. */
function InvoiceDetailContent({ organizationRead }: Readonly<{ organizationRead: OrganizationRead }>) {
	const t = useTranslations();
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const invoiceId = params?.id ?? null;
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const organization = useAtomValue(currentOrganizationState);
	const access = useInvoiceAccess();
	const read = useInvoiceQuery(invoiceId);
	const clientNames = useClientNames();
	const { todayKey, timeZone } = useInvoiceClock();
	const { downloadPdf, pendingId } = useInvoicePdf();
	const actionFlow = useInvoiceActionFlow(read.scope);

	const invoice = read.invoice;
	const isOfWorkspace = isInvoiceOfWorkspace(invoice, read.scope);
	let shownInvoice: TSavedInvoice | null = null;
	let numberText: string | null = null;
	if (isOfWorkspace && invoice) {
		shownInvoice = invoice;
		numberText = invoiceNumberTextOf(invoice);
	}
	const invoicesTitle = t('invoices.TITLE');
	let pageTitle = invoicesTitle;
	if (numberText) {
		pageTitle = t('invoices.detail.HEADING', { number: numberText });
	}
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: invoicesTitle, href: INVOICES_PATH },
		{ title: numberText ?? t('common.LOADING'), href: invoicePagePathOf(invoiceId ?? '') }
	];
	const breadcrumb = <DashboardBreadcrumb icon={<Invoice aria-hidden="true" />} paths={breadcrumbPaths} />;

	const openReplacement = useCallback(
		(target: InvoiceActionTarget) => router.push(replacementInvoicePathOf(target.invoice.id)),
		[router]
	);
	const leaveDeleted = useCallback(() => router.push(INVOICES_PATH), [router]);

	// An invoice read in a workspace another tab switched away from is not shown, as if it were not there
	const isOfOtherWorkspace = Boolean(invoice) && !isOfWorkspace;
	const isMissing = read.isMissing || isOfOtherWorkspace;
	const hasFailed = read.isError && !read.isMissing;
	// Without its organization the document would lose its sender, and its days would follow the browser's zone
	const hasOrganizationFailed = organizationRead.isError && !organization;

	let header: ReactNode = <InvoiceDetailHeaderSkeleton />;
	let body: ReactNode = <InvoiceDetailBodySkeleton />;
	if (isMissing) {
		header = undefined;
		body = (
			<AnimatedEmptyState
				title={t('invoices.detail.NOT_FOUND_TITLE')}
				message={t('invoices.detail.NOT_FOUND_MESSAGE')}
				icon={<Invoice />}
				actionLabel={t('invoices.detail.ALL_INVOICES')}
				actionVariant="outline"
				onAction={() => router.push(INVOICES_PATH)}
				minHeight="420px"
			/>
		);
	} else if (hasFailed) {
		header = undefined;
		body = (
			<AnimatedEmptyState
				title={t('invoices.detail.ERROR_TITLE')}
				message={t('invoices.ERROR_MESSAGE')}
				actionLabel={t('pages.unauthorized.TRY_AGAIN')}
				actionVariant="outline"
				onAction={() => void read.refetch()}
				minHeight="420px"
			/>
		);
	} else if (hasOrganizationFailed) {
		header = undefined;
		body = (
			<AnimatedEmptyState
				title={t('invoices.detail.ERROR_TITLE')}
				message={t('invoices.ERROR_MESSAGE')}
				actionLabel={t('pages.unauthorized.TRY_AGAIN')}
				actionVariant="outline"
				onAction={() => void organizationRead.refetch()}
				minHeight="420px"
			/>
		);
	} else if (shownInvoice) {
		const clientName = invoiceClientNameOf(shownInvoice, clientNames) ?? t('invoices.NO_CLIENT');
		const target: InvoiceActionTarget = { invoice: shownInvoice, numberText: numberText ?? '', clientName };
		const takeAction = (action: InvoiceMenuAction) => actionFlow.takeAction(target, action);
		const download = () => downloadPdf({ id: shownInvoice.id, fileName: invoicePdfFileNameOf(numberText) });
		header = (
			<InvoiceDetailHeader
				invoice={shownInvoice}
				numberText={numberText}
				clientName={clientName}
				todayKey={todayKey}
				timeZone={timeZone}
				canEdit={access.canEdit}
				canRevise={access.canCreate}
				isChanging={actionFlow.changingIds.has(shownInvoice.id)}
				isDownloading={pendingId === shownInvoice.id}
				onDownload={download}
				onAction={takeAction}
			/>
		);
		body = (
			<div className="py-2 pb-8">
				<InvoiceDetailPaper
					invoice={shownInvoice}
					senderName={organization?.name ?? null}
					clientName={clientName}
					numberText={numberText}
					timeZone={timeZone}
				/>
			</div>
		);
	}

	return (
		<PageLayout title={pageTitle} showTimer={isTrackingEnabled} breadcrumb={breadcrumb} mainHeaderSlot={header}>
			{body}
			<InvoiceActionDialogs flow={actionFlow} onVoided={openReplacement} onDeleted={leaveDeleted} />
		</PageLayout>
	);
}

/** The organisation (its time zone dates the invoice) is loaded through its owner hook. */
export function InvoiceDetailPageComponent() {
	const organizationRead = useCurrentOrganizationOwner();
	return (
		<InvoiceAccessGuard need="view" fallback={<InvoiceDetailPageSkeleton />}>
			<InvoiceDetailContent organizationRead={organizationRead} />
		</InvoiceAccessGuard>
	);
}
