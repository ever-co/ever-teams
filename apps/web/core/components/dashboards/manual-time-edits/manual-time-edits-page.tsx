'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale, useTranslations } from 'next-intl';
import { AddManualTimeModalSkeleton } from '@/core/components/common/skeleton/calendar-component-skeletons';
import { Button } from '@/core/components/duplicated-components/_button';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { TimesheetsDialogs } from '@/core/components/dashboards/timesheets/timesheets-dialogs';
import { Chart, Plus } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { LazyAddManualTimeModal } from '@/core/components/optimized-components/calendar';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useManualTimeEditsReport } from '@/core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report';
import { useTimesheetDialogs } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import { useTimesheetLogActions } from '@/core/hooks/dashboards/timesheets/use-timesheet-log-actions';
import { formatPeriod } from '@/core/lib/utils/dashboard-period';
import {
	type EditsFigures,
	MANUAL_EDITS_WEEK_START,
	type ManualTimeEntry
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { isTrackingEnabledState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { EditsFormatters } from './manual-time-edit-row';
import { useManualTimeEditsExportOptions } from './manual-time-edits-export';
import { ManualTimeEditsFeed } from './manual-time-edits-feed';
import { FEED_LAYOUT } from './manual-time-edits-feed-layout';
import { ManualTimeEditsSummaryRail } from './manual-time-edits-summary-rail';
import { ManualTimeEditsEmpty, type EditsTableHandlers } from './manual-time-edits-table';
import {
	AppliedEditsFilters,
	EditsFilterMenu,
	EditsGroupingControl,
	useEditsFilterCategories
} from './manual-time-edits-toolbar';

const PAGE_PATH = '/reports/manual-time-edits';

const META_SEPARATOR = ' · ';

function logsOf(entries: ReadonlyArray<ManualTimeEntry>): ITimeLog[] {
	return entries.map((entry) => entry.log);
}

function noop() {
	return undefined;
}

export function ManualTimeEditsPage() {
	const t = useTranslations();
	const locale = useLocale();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const report = useManualTimeEditsReport({ unnamedLabel: t('timeActivity.UNNAMED_EMPLOYEE') });
	const dialogs = useTimesheetDialogs();
	const { deleteLogs, isDeleting } = useTimesheetLogActions();
	const categories = useEditsFilterCategories(report.members);
	const [isAddTimeOpen, setIsAddTimeOpen] = useState(false);
	const hasOpenedAddTime = useHasBeenOpen(isAddTimeOpen);

	const openAddTime = useCallback(() => setIsAddTimeOpen(true), []);
	const closeAddTime = useCallback(() => setIsAddTimeOpen(false), []);

	const baseFormatters = report.formatters;
	const formatters = useMemo<EditsFormatters>(() => {
		const editedAtFormat = new Intl.DateTimeFormat(locale, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		return { ...baseFormatters, editedAt: (date) => editedAtFormat.format(date) };
	}, [baseFormatters, locale]);

	const { toggleEntry, setEntriesSelected, unselectEntries } = report;
	const { openEdit, openDelete } = dialogs;
	const handlers = useMemo<EditsTableHandlers>(
		() => ({
			toggleEntry,
			selectEntries: setEntriesSelected,
			edit: openEdit,
			remove: (log) => openDelete([log], 'row'),
			removeSelected: (entries) => openDelete(logsOf(entries), 'bulk')
		}),
		[openDelete, openEdit, setEntriesSelected, toggleEntry]
	);

	const handleDeleteConfirmed = useCallback(async () => {
		const { logIds, source } = dialogs.deleteTarget;
		const isBulk = source === 'bulk';
		const announces = !isBulk;
		const isDone = await deleteLogs(logIds, announces);
		if (isDone) {
			unselectEntries(logIds);
		}
	}, [deleteLogs, dialogs.deleteTarget, unselectEntries]);

	const exportOptions = useManualTimeEditsExportOptions({
		groups: report.groups,
		figures: report.figures,
		period: report.shownPeriod,
		teamName: report.teamName
	});

	const title = t('dashboard.manualTimeEdits.TITLE');
	const periodText = formatPeriod(report.period, locale);
	const membersText = t('dashboard.weeklyLimit.MEMBERS_COUNT', { count: report.populationCount });
	const meta = [periodText, membersText].join(META_SEPARATOR);
	const hasShownEntries = report.shownEntries.length > 0;
	const isExportDisabled = !hasShownEntries || report.isLoading;
	const showsReport = !report.showsError && !report.showsNoMembers;
	let actionFigures: EditsFigures | null = report.figures;
	if (report.isLoading) {
		actionFigures = null;
	}

	const breadcrumbPaths = [
		{ title: t('common.REPORTS'), href: '/' },
		{ title, href: PAGE_PATH }
	];

	const actions = (
		<>
			<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />
			<Button type="button" variant="default" size="default" onClick={openAddTime}>
				<Plus />
				<span>{t('dashboard.manualTimeEdits.ADD_MANUAL_TIME')}</span>
			</Button>
		</>
	);

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
					actions={actions}
					controls={
						<>
							<PeriodPicker
								value={report.period}
								onChange={report.setPeriod}
								weekStartsOn={MANUAL_EDITS_WEEK_START}
							/>
							<EditsFilterMenu
								categories={categories}
								filters={report.filters}
								onChange={report.setFilter}
								onClear={report.clearFilters}
							/>
						</>
					}
					trailingControls={
						<EditsGroupingControl grouping={report.grouping} onGroupingChange={report.setGrouping} />
					}
					belowControls={
						<AppliedEditsFilters
							categories={categories}
							filters={report.filters}
							onRemove={report.removeFilterValue}
							onClear={report.clearFilters}
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
							message={t('dashboard.manualTimeEdits.NO_MEMBERS_MESSAGE')}
						/>
					</DashboardSection>
				)}
				{showsReport && (
					<div className={FEED_LAYOUT}>
						<ManualTimeEditsFeed
							figures={report.figures}
							actionFigures={actionFigures}
							share={report.trackedShare}
							action={report.action}
							onActionChange={report.setAction}
							groups={report.groups}
							grouping={report.grouping}
							members={report.members}
							selectedIdSet={report.selectedIdSet}
							permissions={report.permissions}
							formatters={formatters}
							handlers={handlers}
							isLoading={report.isLoading}
							isUpdating={report.isUpdating}
							empty={
								<ManualTimeEditsEmpty
									period={report.shownPeriod}
									isFiltered={report.isFiltered}
									onClearFilters={report.clearNarrowing}
									onAddTime={openAddTime}
									onPreviousPeriod={report.showPreviousPeriod}
								/>
							}
						/>
						<ManualTimeEditsSummaryRail
							figures={report.figures}
							share={report.trackedShare}
							rankings={report.rankings}
							isLoading={report.isLoading}
						/>
					</div>
				)}
			</div>
			{hasOpenedAddTime && (
				<Suspense fallback={<AddManualTimeModalSkeleton />}>
					<LazyAddManualTimeModal
						closeModal={closeAddTime}
						isOpen={isAddTimeOpen}
						params="AddManuelTime"
						timeSheetStatus="ManagerTimesheet"
					/>
				</Suspense>
			)}
			<TimesheetsDialogs
				dialogs={dialogs}
				canAddTime={false}
				isDeleting={isDeleting}
				onRejected={noop}
				onDeleteConfirmed={handleDeleteConfirmed}
			/>
		</PageLayout>
	);
}
