'use client';

import { useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { useTimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import type { TimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import {
	TIME_ACTIVITY_GROUPINGS,
	TIME_ACTIVITY_WEEK_START,
	type TimeActivityGrouping
} from '@/core/lib/utils/dashboards/time-activity';
import { AppliedTimeActivityFilters, TimeActivityFilterMenu } from './time-activity-filter-menu';
import { TimeActivityViewMenu } from './time-activity-view-menu';

const GROUPING_LABEL_KEYS: Record<TimeActivityGrouping, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.timeActivity.grouping.DATE',
	member: 'dashboard.timeActivity.grouping.MEMBER',
	project: 'dashboard.timeActivity.grouping.PROJECT',
	task: 'dashboard.timeActivity.grouping.TASK',
	week: 'dashboard.timeActivity.grouping.WEEK',
	client: 'common.CLIENT'
};

function ToolbarMeta({ report }: Readonly<{ report: TimeActivityReport }>) {
	const t = useTranslations();
	const locale = useLocale();
	const periodText = formatPeriod(report.period, locale);
	const membersText = t('dashboard.timeActivity.META_MEMBERS', { count: report.totals.memberCount });
	return <span>{`${periodText} · ${membersText}`}</span>;
}

/**
 * The filter values are read here, so a team refresh re-renders the toolbar and not the report. Export sits at the
 * end of the report sheet's summary band on this page.
 */
export function TimeActivityToolbar({ report }: Readonly<{ report: TimeActivityReport }>) {
	const t = useTranslations();
	const filterOptions = useTimeActivityFilterOptions();
	const { settings } = report;

	const groupingItems = useMemo<SegmentedControlItem<TimeActivityGrouping>[]>(
		() => TIME_ACTIVITY_GROUPINGS.map((grouping) => ({ value: grouping, label: t(GROUPING_LABEL_KEYS[grouping]) })),
		[t]
	);

	return (
		<DashboardToolbar
			title={t('timeActivity.TIME_AND_ACTIVITY')}
			meta={<ToolbarMeta report={report} />}
			isMetaLoading={report.isDailyPending}
			isUpdating={report.isUpdating}
			updatingLabel={t('dashboard.timeActivity.UPDATING')}
			controls={
				<>
					<PeriodPicker
						value={report.period}
						onChange={report.setPeriod}
						weekStartsOn={TIME_ACTIVITY_WEEK_START}
					/>
					<TimeActivityFilterMenu
						options={filterOptions}
						filters={settings.filters}
						activeFilterCount={settings.activeFilterCount}
						onChange={settings.setFilterValues}
						onClear={settings.clearFilters}
					/>
				</>
			}
			trailingControls={
				<>
					<SegmentedControl<TimeActivityGrouping>
						items={groupingItems}
						value={settings.grouping}
						onValueChange={settings.setGrouping}
						ariaLabel={t('dashboard.timeActivity.grouping.LABEL')}
					/>
					<TimeActivityViewMenu
						grouping={settings.grouping}
						isManager={report.isManager}
						hiddenColumns={settings.hiddenColumns}
						onToggleColumn={settings.toggleColumn}
					/>
				</>
			}
			belowControls={
				<AppliedTimeActivityFilters
					filters={settings.filters}
					options={filterOptions}
					onRemove={settings.removeFilterValue}
					onClear={settings.clearFilters}
				/>
			}
		/>
	);
}
