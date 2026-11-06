'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Wallet } from '@/core/components/icons';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { AppliedMemberFilters, MemberFilterMenu } from '@/core/components/dashboards/weekly-limit/weekly-limit-toolbar';
import { usePaymentsDueReport } from '@/core/hooks/dashboards/payments-due/use-payments-due-report';
import { formatPeriod, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { type OwedDayGroup, type OwedMemberGroup, PAYMENTS_WEEK_START } from '@/core/lib/utils/dashboards/payments-due';
import { isTrackingEnabledState } from '@/core/stores';
import { PaymentsDueBalanceTiles } from './payments-due-balance-tiles';
import { usePaymentsDueExportOptions } from './payments-due-export';
import { PaymentsDueStatements } from './payments-due-statements';
import { PaymentsDueEmpty } from './payments-due-table';
import { PaymentsGroupingControl } from './payments-due-toolbar';
import { PaymentsDueUnpricedCallout } from './payments-due-unpriced-callout';

const PAGE_PATH = '/reports/payments-due';

const EMPTY_MEMBER_GROUPS: OwedMemberGroup[] = [];

const EMPTY_DAY_GROUPS: OwedDayGroup[] = [];

export function PaymentsDuePage() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = usePaymentsDueReport({ unnamedLabel: t('timeActivity.UNNAMED_EMPLOYEE') });
	const { period, setPeriod, shown } = report;

	const title = t('dashboard.paymentsDue.TITLE');
	const shownPeriod = shown?.period ?? report.requestPeriod;
	const shownGroupCount = shown?.memberGroups.length ?? 0;
	const hasRows = shownGroupCount > 0;
	const isFiltered = report.appliedEmployeeIds.length > 0;
	const shownFigures = shown?.figures ?? null;

	const exportOptions = usePaymentsDueExportOptions({ shown, teamName: report.teamName });

	const showPreviousPeriod = useCallback(() => {
		const previousPeriod = shiftPeriod(period, -1);
		setPeriod(previousPeriod);
	}, [period, setPeriod]);

	const periodText = formatPeriod(report.requestPeriod, locale);
	const membersText = t('dashboard.paymentsDue.MEMBERS_COUNT', { count: report.populationCount });
	const meta = `${periodText} · ${membersText}`;
	const isExportDisabled = !hasRows || report.isLoading;
	const showsReport = !report.showsError && !report.showsNoMembers;

	const breadcrumbPaths = [
		{ title: t('common.REPORTS'), href: '/' },
		{ title, href: PAGE_PATH }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Wallet aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={meta}
					isMetaLoading={!report.isTeamReady}
					isUpdating={report.isUpdating}
					updatingLabel={t('dashboard.paymentsDue.UPDATING')}
					actions={<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />}
					controls={
						<>
							<PeriodPicker value={period} onChange={setPeriod} weekStartsOn={PAYMENTS_WEEK_START} />
							<MemberFilterMenu
								members={report.members}
								selectedIds={report.appliedEmployeeIds}
								onChange={report.setSelectedEmployeeIds}
								onClear={report.clearMembers}
							/>
						</>
					}
					trailingControls={
						<PaymentsGroupingControl grouping={report.grouping} onGroupingChange={report.setGrouping} />
					}
					belowControls={
						<AppliedMemberFilters
							members={report.members}
							selectedIds={report.appliedEmployeeIds}
							onRemove={report.removeMember}
							onClear={report.clearMembers}
						/>
					}
				/>
			}
		>
			<div className={DASHBOARD_STACK}>
				{report.showsError && <DashboardErrorNotice onRetry={report.refetch} />}
				{report.showsNoMembers && (
					<DashboardSection>
						<BlockEmptyMessage
							title={t('dashboard.paymentsDue.NO_MEMBERS_TITLE')}
							message={t('dashboard.paymentsDue.NO_MEMBERS_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsReport && (
					<>
						<PaymentsDueBalanceTiles
							tiles={report.tiles}
							figures={shownFigures}
							isLoading={report.isLoading}
						/>
						{!report.isLoading && <PaymentsDueUnpricedCallout figures={shownFigures} />}
						<PaymentsDueStatements
							grouping={report.grouping}
							memberGroups={shown?.memberGroups ?? EMPTY_MEMBER_GROUPS}
							dayGroups={shown?.dayGroups ?? EMPTY_DAY_GROUPS}
							figures={shownFigures}
							isLoading={report.isLoading}
							isUpdating={report.isUpdating}
							empty={
								<PaymentsDueEmpty
									period={shownPeriod}
									isFiltered={isFiltered}
									onClearFilters={report.clearMembers}
									onPreviousPeriod={showPreviousPeriod}
								/>
							}
						/>
					</>
				)}
			</div>
		</PageLayout>
	);
}
