'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout/page-layout';
import { BreadcrumbSkeleton } from '@/core/components/layouts/page-skeleton';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import type { ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { Analytics, FilePdf, FileSheet } from '@/core/components/icons';
import { useAppsUrlsReport, type AppsUrlsReportState } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-report';
import { useAppsUrlsPeople } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-people';
import { useAppsUrlsMosaic } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-mosaic';
import { useAppsUrlsDay } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-day';
import { useAuthenticateUser } from '@/core/hooks/auth';
import { useAreTeamsSettled } from '@/core/hooks/organizations/teams/use-are-teams-settled';
import { formatPeriod, shiftPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { activeTeamNameState } from '@/core/stores/teams/organization-team';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import { AppsUrlsToolbar } from './apps-urls-toolbar';
import { AppsUrlsDay } from './apps-urls-day';
import { AppsUrlsOverview } from './apps-urls-overview';
import { AppsUrlsRankedList } from './apps-urls-ranked-list';
import { downloadAppsUrlsCsv, downloadAppsUrlsPdf } from './apps-urls-export';

function AppsUrlsBreadcrumb({ title }: Readonly<{ title: string }>) {
	const t = useTranslations();
	const pathname = usePathname();
	const teamName = useAtomValue(activeTeamNameState);
	const areTeamsSettled = useAreTeamsSettled();
	if (!areTeamsSettled) {
		return <BreadcrumbSkeleton />;
	}
	const paths = [
		{ title: teamName || t('common.ALL_TEAMS'), href: '/' },
		{ title, href: pathname }
	];
	return <DashboardBreadcrumb icon={<Analytics aria-hidden="true" />} paths={paths} />;
}

function useExportOptions(report: AppsUrlsReportState): ExportOption[] {
	const t = useTranslations();
	const locale = useLocale();
	const { rows, groups, view, period, figures } = report;
	return useMemo(() => {
		const input = { rows, groups, view, period, figures, locale, t };
		return [
			{
				key: 'pdf',
				label: t('common.PDF'),
				icon: <FilePdf className="text-muted-foreground" />,
				run: () => downloadAppsUrlsPdf(input)
			},
			{
				key: 'csv',
				label: t('dashboard.appsUrls.EXPORT_CSV'),
				icon: <FileSheet className="text-muted-foreground" />,
				run: () => downloadAppsUrlsCsv(input)
			}
		];
	}, [figures, groups, locale, period, rows, t, view]);
}

function EmptyPeriod({
	period,
	isFiltered,
	onPeriodChange,
	onClearFilters
}: Readonly<{
	period: Period;
	isFiltered: boolean;
	onPeriodChange: (period: Period) => void;
	onClearFilters: () => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const periodText = formatPeriod(period, locale);
	const showPreviousPeriod = () => onPeriodChange(shiftPeriod(period, -1));

	if (isFiltered) {
		return (
			<BlockEmptyMessage
				title={t('dashboard.appsUrls.EMPTY_FILTERED_TITLE', { period: periodText })}
				message={t('dashboard.appsUrls.EMPTY_FILTERED_MESSAGE')}
				action={
					<Button type="button" variant="outline" size="default" onClick={onClearFilters}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}
	return (
		<BlockEmptyMessage
			title={t('dashboard.appsUrls.EMPTY_TITLE', { period: periodText })}
			message={t('dashboard.appsUrls.EMPTY_MESSAGE')}
			action={
				<Button type="button" variant="outline" size="default" onClick={showPreviousPeriod}>
					{t('dashboard.period.PREVIOUS')}
				</Button>
			}
		/>
	);
}

/**
 * Apps & URLs: which apps and sites the team spent its tracked time in over a period. The split of the time and the
 * mosaic of every app and site share one surface, the ranked list under it; a tile of the mosaic narrows the list.
 * The toolbar never waits for data, and a new period keeps the previous figures on screen until its own arrive.
 */
export function AppsUrlsPage() {
	const t = useTranslations();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useAppsUrlsReport();
	const people = useAppsUrlsPeople(report.rows);
	const mosaic = useAppsUrlsMosaic(report);
	const { user } = useAuthenticateUser();
	const ownEmployeeId = user?.employee?.id ?? null;
	const day = useAppsUrlsDay({
		rows: report.rows,
		selectedEmployeeIds: report.selectedEmployeeIds,
		ownEmployeeId
	});
	const exportOptions = useExportOptions(report);
	const title = t('sidebar.APPS_AND_URLS');

	const hasRows = report.rows.length > 0;
	const isUnavailable = report.isError && !report.hasData;
	const isWaitingForData = report.isLoading || report.isRefreshing;
	const isExportDisabled = isWaitingForData || !hasRows;
	const hasListRows = hasRows && !isUnavailable;
	const showsList = report.isLoading || hasListRows;
	const showsDay = hasListRows && !report.isLoading;
	const pickedKey = mosaic.pickedItem?.key ?? null;

	const { period, isFiltered, setPeriod, clearMembers } = report;
	const emptyState = useMemo(
		() => (
			<EmptyPeriod
				period={period}
				isFiltered={isFiltered}
				onPeriodChange={setPeriod}
				onClearFilters={clearMembers}
			/>
		),
		[clearMembers, isFiltered, period, setPeriod]
	);
	const errorNotice = isUnavailable && <DashboardErrorNotice onRetry={report.refetch} />;

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<AppsUrlsBreadcrumb title={title} />}
			mainHeaderSlot={
				<AppsUrlsToolbar
					title={title}
					period={report.period}
					onPeriodChange={report.setPeriod}
					view={report.view}
					onViewChange={report.setView}
					canFilterMembers={report.canFilterMembers}
					people={people}
					selectedEmployeeIds={report.selectedEmployeeIds}
					onMembersChange={report.setSelectedEmployeeIds}
					onClearMembers={report.clearMembers}
					isUpdating={report.isUpdating}
					exportOptions={exportOptions}
					isExportDisabled={isExportDisabled}
				/>
			}
		>
			<div className={DASHBOARD_STACK} aria-busy={report.isRefreshing}>
				<AppsUrlsOverview
					figures={report.figures}
					splitRows={mosaic.splitRows}
					items={mosaic.items}
					pickedKey={pickedKey}
					onPick={mosaic.togglePick}
					isLoading={report.isLoading}
					isUnavailable={isUnavailable}
					isCapped={report.isCapped}
					errorNotice={errorNotice}
					emptyState={emptyState}
				/>
				{showsDay && <AppsUrlsDay state={day} canPickMember={report.canFilterMembers} />}
				{showsList && (
					<AppsUrlsRankedList
						key={report.view}
						view={report.view}
						groups={mosaic.listGroups}
						totals={mosaic.listTotals}
						isLoading={report.isLoading}
						pickedItem={mosaic.pickedItem}
						onClearPick={mosaic.clearPick}
					/>
				)}
			</div>
		</PageLayout>
	);
}
