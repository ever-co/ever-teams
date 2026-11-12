'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { controlRecipe } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice } from '@/core/components/icons';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { INVOICE_WEEK_START, useNewInvoice, type NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { cn } from '@/core/lib/helpers';
import { formatPeriod, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import type { InvoiceGrouping } from '@/core/lib/utils/invoices';
import { isTrackingEnabledState } from '@/core/stores';
import { InvoiceAccessGuard, INVOICES_PATH, NEW_INVOICE_PATH } from '../invoice-access-guard';
import { InvoiceDetails } from './invoice-details';
import { EarlierInvoices } from './invoice-earlier';
import { OtherCurrencies, UnpricedTimeList } from './invoice-left-out';
import { InvoiceSheet } from './invoice-sheet';
import { NEW_INVOICE_LAYOUT } from './new-invoice-recipes';
import { InvoiceSheetSkeleton, MessageLink, NewInvoiceMessage, NewInvoicePageSkeleton } from './new-invoice-states';
import { SaveInvoiceDialog } from './save-invoice-dialog';

function ClientSelect({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	const t = useTranslations();
	const selectId = useId();
	return (
		<>
			<label htmlFor={selectId} className="sr-only">
				{t('common.CLIENT')}
			</label>
			<select
				id={selectId}
				value={invoice.client?.id ?? ''}
				disabled={invoice.areClientsLoading}
				onChange={(event) => invoice.changeClient(event.target.value)}
				className={cn(
					controlRecipe,
					'h-8 w-auto max-w-full min-w-36 rounded-full px-3 text-[13px] sm:max-w-64 sm:min-w-44'
				)}
			>
				<option value="">{t('invoices.new.CLIENT_PLACEHOLDER')}</option>
				{invoice.clients.map((client) => (
					<option key={client.id} value={client.id}>
						{client.name}
					</option>
				))}
			</select>
		</>
	);
}

function OverlapNotice({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
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

function PreparedInvoice({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
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

function NewInvoiceBody({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	const t = useTranslations();
	const clientName = invoice.client?.name ?? '';
	const time = invoice.time;
	const hasClients = invoice.clients.length > 0;
	const hasBillableTime = time.lines.length > 0 || time.unpriced.length > 0;

	if (invoice.areClientsLoading) {
		return <InvoiceSheetSkeleton />;
	}
	if (invoice.haveClientsFailed) {
		return <DashboardErrorNotice onRetry={() => void invoice.refetchClients()} />;
	}
	if (!hasClients) {
		return (
			<NewInvoiceMessage
				title={t('invoices.new.NO_CLIENTS_TITLE')}
				message={t('invoices.new.NO_CLIENTS_MESSAGE')}
				action={<MessageLink href="/clients">{t('invoices.new.OPEN_CLIENTS')}</MessageLink>}
			/>
		);
	}
	if (!invoice.client) {
		return (
			<NewInvoiceMessage
				title={t('invoices.new.CHOOSE_CLIENT_TITLE')}
				message={t('invoices.new.CHOOSE_CLIENT_MESSAGE')}
			/>
		);
	}
	if (time.isLoading) {
		return <InvoiceSheetSkeleton />;
	}
	if (time.isError) {
		return <DashboardErrorNotice title={t('invoices.new.TIME_ERROR_TITLE')} onRetry={time.refetch} />;
	}
	if (!time.hasProjects) {
		return (
			<NewInvoiceMessage
				title={t('invoices.new.NO_PROJECTS_TITLE', { client: clientName })}
				message={t('invoices.new.NO_PROJECTS_MESSAGE')}
				action={<MessageLink href="/projects">{t('invoices.new.OPEN_PROJECTS')}</MessageLink>}
			/>
		);
	}
	if (!hasBillableTime) {
		return (
			<NewInvoiceMessage
				title={t('invoices.new.NO_TIME_TITLE', { client: clientName })}
				message={t('invoices.new.NO_TIME_MESSAGE')}
				action={
					<Button
						type="button"
						variant="outline"
						size="default"
						onClick={() => invoice.changePeriod(shiftPeriod(invoice.period, -1))}
					>
						{t('invoices.new.PREVIOUS_PERIOD')}
					</Button>
				}
			/>
		);
	}
	return <PreparedInvoice invoice={invoice} />;
}

/** Mounted once the role may create invoices: nothing of an invoice is read for anyone else. */
function NewInvoiceContent() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const invoice = useNewInvoice();

	const title = t('invoices.new.TITLE');
	const breadcrumbPaths = [
		{ title: t('invoices.TITLE'), href: INVOICES_PATH },
		{ title, href: NEW_INVOICE_PATH }
	];
	const groupingItems: Array<{ value: InvoiceGrouping; label: string }> = [
		{ value: 'member', label: t('invoices.new.GROUP_BY_MEMBER') },
		{ value: 'task', label: t('invoices.new.GROUP_BY_TASK') }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Invoice aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={formatPeriod(invoice.period, locale)}
					isUpdating={invoice.time.isUpdating}
					updatingLabel={t('invoices.new.UPDATING')}
					actions={
						<Button asChild variant="outline" size="default">
							<Link href={INVOICES_PATH}>{t('common.CANCEL')}</Link>
						</Button>
					}
					controls={
						<>
							<ClientSelect invoice={invoice} />
							<PeriodPicker
								value={invoice.period}
								onChange={invoice.changePeriod}
								weekStartsOn={INVOICE_WEEK_START}
							/>
						</>
					}
					trailingControls={
						<SegmentedControl<InvoiceGrouping>
							items={groupingItems}
							value={invoice.grouping}
							onValueChange={invoice.changeGrouping}
							ariaLabel={t('invoices.new.GROUPING_LABEL')}
						/>
					}
				/>
			}
		>
			<NewInvoiceBody invoice={invoice} />
		</PageLayout>
	);
}

/** The organisation (its name, its time zone and its payment term fill the invoice) is loaded through its owner hook. */
function NewInvoicePage() {
	useCurrentOrganizationOwner();
	return (
		<InvoiceAccessGuard need="create" fallback={<NewInvoicePageSkeleton />}>
			<NewInvoiceContent />
		</InvoiceAccessGuard>
	);
}

export default withAuthentication(NewInvoicePage, {
	displayName: 'NewInvoicePage',
	skeleton: NewInvoicePageSkeleton
});
