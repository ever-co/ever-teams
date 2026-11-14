'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { Button } from '@/core/components/duplicated-components/_button';
import { Clock, Invoice, Undo } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import type { InvoiceDraftState, InvoiceScreenState } from '@/core/hooks/invoices/use-new-invoice';
import { isTrackingEnabledState } from '@/core/stores';
import { INVOICES_PATH } from '../invoice-access-guard';
import { InvoiceDetails } from './invoice-details';
import { EarlierInvoices } from './invoice-earlier';
import { OtherCurrencies, UnpricedTimeList } from './invoice-left-out';
import { InvoiceSheet } from './invoice-sheet';
import { NEW_INVOICE_LAYOUT } from './new-invoice-recipes';
import { InvoiceSheetSkeleton } from './new-invoice-states';

export interface SaveDialogControl {
	open: boolean;
	onClose: () => void;
}

/** Earlier invoices of the same period: a note when the hours they bill are left out, else a warning. */
export function OverlapNotice({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	const notice = invoice.overlapNotice;
	const client = invoice.client?.name ?? '';
	if (notice.kind === 'none') {
		return null;
	}
	if (notice.kind === 'leftOut') {
		return (
			<Notice
				tone="info"
				title={t('invoices.billedTime.LEFT_OUT_TITLE')}
				description={t('invoices.billedTime.LEFT_OUT_MESSAGE', { count: notice.count, client })}
			/>
		);
	}
	let description = t('invoices.new.earlier.OVERLAP_MESSAGE');
	if (notice.isUnrecorded) {
		description = t('invoices.billedTime.UNRECORDED_MESSAGE', { count: notice.count });
	}
	return (
		<Notice
			tone="warning"
			title={t('invoices.new.earlier.OVERLAP_TITLE', { count: notice.count, client })}
			description={description}
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

	const closeSaveDialog = () => {
		setIsConfirming(false);
		invoice.readDeferredTime();
	};

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
			{renderSaveDialog({ open: isConfirming, onClose: closeSaveDialog })}
		</div>
	);
}

/** Rebuilds the lines of an invoice read back from the time as it is now, or reads that time again. */
export function TakeTimeAgainButton({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	return (
		<Button
			type="button"
			variant="outline"
			size="default"
			onClick={invoice.takeTimeAgain}
			disabled={invoice.time.isUpdating}
		>
			<Clock />
			{t('invoices.edit.TAKE_TIME_AGAIN')}
		</Button>
	);
}

function TimeReadFailure({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	return (
		<Notice
			tone="error"
			title={t('invoices.new.TIME_ERROR_TITLE')}
			description={t('invoices.edit.TIME_ERROR_MESSAGE')}
			actions={
				<>
					<Button type="button" variant="outline" size="default" onClick={invoice.time.refetch}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</Button>
					<Button type="button" variant="ghost" size="default" onClick={invoice.backToSavedLines}>
						<Undo />
						{t('invoices.edit.BACK_TO_SAVED')}
					</Button>
				</>
			}
		/>
	);
}

/**
 * The body of an invoice started from a saved one, edited or replaced: its client and period are the saved ones, so
 * only the time it is rebuilt from can still be missing.
 */
export function RevisedInvoiceBody({
	invoice,
	notice,
	renderSaveDialog
}: Readonly<{
	invoice: InvoiceScreenState;
	notice?: ReactNode;
	renderSaveDialog: (dialog: SaveDialogControl) => ReactNode;
}>) {
	const t = useTranslations();
	const time = invoice.time;
	const readsTime = invoice.linesSource === 'time';
	const isReadingTime = readsTime && time.isLoading;
	const hasTimeFailed = readsTime && time.isError;
	// The saved lines are saved again with the time they bill: they wait for it
	const isReadingLinesTime = isReadingTime || time.isReadingBilledTime;
	const hasBilledTimeFailed = !readsTime && time.hasBilledTimeFailed;
	const isWaiting = invoice.areClientsLoading || invoice.isOrganizationLoading;
	if (isWaiting) {
		return <InvoiceSheetSkeleton />;
	}
	if (invoice.haveClientsFailed) {
		return <DashboardErrorNotice title={t('clients.ERROR_TITLE')} onRetry={() => void invoice.refetchClients()} />;
	}
	if (invoice.hasOrganizationFailed) {
		return (
			<DashboardErrorNotice
				title={t('invoices.new.ORGANIZATION_ERROR_TITLE')}
				onRetry={() => void invoice.refetchOrganization()}
			/>
		);
	}
	if (isReadingLinesTime) {
		return <InvoiceSheetSkeleton />;
	}
	if (hasTimeFailed) {
		return <TimeReadFailure invoice={invoice} />;
	}
	if (hasBilledTimeFailed) {
		return <DashboardErrorNotice title={t('invoices.new.TIME_ERROR_TITLE')} onRetry={time.refetch} />;
	}
	return <PreparedInvoice invoice={invoice} notice={notice} renderSaveDialog={renderSaveDialog} />;
}

export function CancelInvoiceLink() {
	const t = useTranslations();
	return (
		<Button asChild variant="outline" size="default">
			<Link href={INVOICES_PATH}>{t('common.CANCEL')}</Link>
		</Button>
	);
}

interface InvoiceScreenFrameProps {
	title: string;
	/** Where the breadcrumb's last step points: this screen. */
	href: string;
	toolbar?: ReactNode;
	children: ReactNode;
}

/** The page around an invoice started from a saved one; a toolbar with its title and Cancel when none is given. */
export function InvoiceScreenFrame({ title, href, toolbar, children }: Readonly<InvoiceScreenFrameProps>) {
	const t = useTranslations();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const breadcrumbPaths = [
		{ title: t('invoices.TITLE'), href: INVOICES_PATH },
		{ title, href }
	];
	const shownToolbar = toolbar ?? <DashboardToolbar title={title} actions={<CancelInvoiceLink />} />;
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
