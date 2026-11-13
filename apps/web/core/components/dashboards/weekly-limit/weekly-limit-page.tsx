'use client';

import { useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Chart } from '@/core/components/icons';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { useWeeklyLimitReport } from '@/core/hooks/dashboards/weekly-limit/use-weekly-limit-report';
import { formatPeriod, shiftPeriod } from '@/core/lib/utils/dashboard-period';
import { LIMIT_WEEK_START, type LimitDuration, type LimitMember } from '@/core/lib/utils/dashboards/weekly-limit';
import { isTrackingEnabledState } from '@/core/stores';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { LimitAttentionList, LimitAttentionSkeleton } from './limit-attention';
import { LimitHeatmap, LimitHeatmapSkeleton } from './limit-heatmap';
import { useWeeklyLimitMatrixExportOptions } from './weekly-limit-export';
import { WeeklyLimitEmpty } from './weekly-limit-table';
import { AppliedMemberFilters, LimitDurationSwitch, MemberFilterMenu } from './weekly-limit-toolbar';

const PAGE_PATH = '/reports/weekly-limit';

const NO_MEMBERS: LimitMember[] = [];

function titleOf(duration: LimitDuration, t: ReturnType<typeof useTranslations>) {
	if (duration === 'week') {
		return t('common.WEEKLY_LIMIT');
	}
	return t('common.DAILY_LIMIT');
}

function toggledKeyOf(current: string | null, key: string) {
	if (current === key) {
		return null;
	}
	return key;
}

export function WeeklyLimitPage() {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useWeeklyLimitReport({ unnamedLabel: t('timeActivity.UNNAMED_EMPLOYEE') });
	const { period, setPeriod, shown } = report;
	const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

	const title = titleOf(report.duration, t);
	const shownDuration = shown?.duration ?? report.duration;
	const shownTitle = titleOf(shownDuration, t);
	const shownPeriod = shown?.period ?? report.requestPeriod;
	const shownEntryCount = shown?.entries.length ?? 0;
	const hasEntries = shownEntryCount > 0;
	const isFiltered = report.appliedEmployeeIds.length > 0;
	const membersWithoutTime = shown?.membersWithoutTime ?? NO_MEMBERS;

	const exportOptions = useWeeklyLimitMatrixExportOptions({
		shown,
		periodGroups: report.periodGroups,
		memberGroups: report.memberGroups,
		reportTitle: shownTitle,
		teamName: report.teamName
	});

	const showPreviousPeriod = useCallback(() => {
		const previousPeriod = shiftPeriod(period, -1);
		setPeriod(previousPeriod);
	}, [period, setPeriod]);

	const toggleHighlight = useCallback((key: string) => {
		setHighlightedKey((current) => toggledKeyOf(current, key));
	}, []);

	const periodText = formatPeriod(report.requestPeriod, locale);
	const membersText = t('dashboard.weeklyLimit.MEMBERS_COUNT', { count: report.populationCount });
	const meta = `${periodText} · ${membersText}`;
	const isExportDisabled = !hasEntries || report.isLoading;
	const showsReport = !report.showsError && !report.showsNoMembers;
	const showsSkeleton = showsReport && report.isLoading;
	const showsData = showsReport && !report.isLoading;
	const showsAttention = showsData && hasEntries;

	const breadcrumbPaths = [
		{ title: t('common.REPORTS'), href: '/' },
		{ title, href: PAGE_PATH }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Chart aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					meta={meta}
					isMetaLoading={!report.isTeamReady}
					isUpdating={report.isUpdating}
					updatingLabel={t('dashboard.weeklyLimit.UPDATING')}
					actions={<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />}
					controls={
						<>
							<PeriodPicker
								value={period}
								onChange={setPeriod}
								weekStartsOn={LIMIT_WEEK_START}
								locale={locale}
							/>
							<MemberFilterMenu
								members={report.members}
								selectedIds={report.appliedEmployeeIds}
								onChange={report.setSelectedEmployeeIds}
								onClear={report.clearMembers}
							/>
						</>
					}
					trailingControls={
						<LimitDurationSwitch duration={report.duration} onDurationChange={report.setDuration} />
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
							title={t('dashboard.weeklyLimit.NO_MEMBERS_TITLE')}
							message={t('dashboard.weeklyLimit.NO_MEMBERS_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsSkeleton && (
					<>
						<LimitAttentionSkeleton />
						<LimitHeatmapSkeleton period={report.requestPeriod} duration={report.duration} />
					</>
				)}
				{showsData && (
					<>
						{showsAttention && (
							<LimitAttentionList
								items={report.attention}
								duration={shownDuration}
								highlightedKey={highlightedKey}
								onHighlight={toggleHighlight}
							/>
						)}
						<LimitHeatmap
							rows={report.matrixRows}
							period={shownPeriod}
							duration={shownDuration}
							membersWithoutTime={membersWithoutTime}
							highlightedKey={highlightedKey}
							isUpdating={report.isUpdating}
							empty={
								<WeeklyLimitEmpty
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
