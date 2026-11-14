'use client';

import { useMemo, useRef } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { useTimeActivityFilterOptions } from '@/core/hooks/dashboards/time-activity/use-time-activity-filter-options';
import type { TimeActivityReport } from '@/core/hooks/dashboards/time-activity/use-time-activity-report';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import { type TimeActivityGrouping } from '@/core/lib/utils/dashboards/time-activity';
import { useRevealSelectedTab } from '@/core/hooks/common/use-reveal-selected-tab';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { TimeActivityControlRow } from './time-activity-control-row';
import { AppliedTimeActivityFilters, TimeActivityFilterMenu } from './time-activity-filter-menu';
import { TimeActivityViewMenu } from './time-activity-view-menu';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';

/** A phone too narrow for every grouping scrolls the switch inside its line. */
const SWITCH_SCROLLER = '-m-1 min-w-0 max-w-full overflow-x-auto no-scrollbar';

/** The room is inside what scrolls, so the focus ring of the first or last option is never cut, scrolled or not. */
const SWITCH_RING_ROOM = 'w-max p-1';

const FOCUS_RING_ROOM_PX = 4;

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
	const locale = useWorkspaceLocale();
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
	const weekStart = useWorkspaceWeekStart();
	const locale = useWorkspaceLocale();
	const filterOptions = useTimeActivityFilterOptions();
	const { settings } = report;
	const switchScrollerRef = useRef<HTMLDivElement>(null);
	useRevealSelectedTab(switchScrollerRef, settings.grouping, FOCUS_RING_ROOM_PX);

	const groupingItems = useMemo<SegmentedControlItem<TimeActivityGrouping>[]>(
		() => settings.groupings.map((grouping) => ({ value: grouping, label: t(GROUPING_LABEL_KEYS[grouping]) })),
		[settings.groupings, t]
	);

	return (
		<DashboardToolbar
			title={t('timeActivity.TIME_AND_ACTIVITY')}
			meta={<ToolbarMeta report={report} />}
			isMetaLoading={report.isDailyPending}
			isUpdating={report.isUpdating}
			updatingLabel={t('dashboard.timeActivity.UPDATING')}
			controls={
				<TimeActivityControlRow
					leading={
						<>
							<PeriodPicker
								value={report.period}
								onChange={report.setPeriod}
								weekStartsOn={weekStart}
								locale={locale}
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
					trailing={
						<>
							<div ref={switchScrollerRef} className={SWITCH_SCROLLER}>
								<div className={SWITCH_RING_ROOM}>
									<SegmentedControl<TimeActivityGrouping>
										items={groupingItems}
										value={settings.grouping}
										onValueChange={settings.setGrouping}
										ariaLabel={t('dashboard.timeActivity.grouping.LABEL')}
									/>
								</div>
							</div>
							<TimeActivityViewMenu
								grouping={settings.grouping}
								isManager={report.isManager}
								hiddenColumns={settings.hiddenColumns}
								onToggleColumn={settings.toggleColumn}
							/>
						</>
					}
				/>
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
