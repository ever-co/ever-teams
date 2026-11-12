'use client';

import { type ReactNode, use, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { PageLayout } from '@/core/components/layouts/default-layout/page-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { DashboardBreadcrumb } from '@/core/components/dashboards/kit/dashboard-breadcrumb';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { ExportMenu } from '@/core/components/dashboards/kit/export-menu';
import { DASHBOARD_STACK, DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { Clock, Plus } from '@/core/components/icons';
import { useTimesheetDialogs } from '@/core/hooks/dashboards/timesheets/use-timesheet-dialogs';
import { useTimesheetLogActions } from '@/core/hooks/dashboards/timesheets/use-timesheet-log-actions';
import { useTimesheetSheet } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import { canEditLog, useTimesheetsPage } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	sheetMembersOf,
	type TimesheetDay,
	type TimesheetView,
	totalDurationOf
} from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TimesheetRowHandlers } from './timesheet-log-row';
import { TimesheetsMonthView, TimesheetsWeekView } from './timesheets-calendar';
import { TimesheetsDialogs } from './timesheets-dialogs';
import { useTimesheetExportOptions } from './timesheets-export';
import { useTimesheetFilterCategories, useTimesheetFilterControls } from './timesheets-filters';
import { TimesheetsList } from './timesheets-list';
import { TimesheetsReportSkeleton } from './timesheets-page-skeleton';
import { TimesheetsScreenshotsView } from './timesheets-screenshots-view';
import { TimesheetsSheetView } from './timesheets-sheet-view';
import { TimesheetsSelectionBar } from './timesheets-states';
import { TimesheetsStatusCards } from './timesheets-status-cards';
import { TimesheetsToolbar } from './timesheets-toolbar';

const NO_MEMBERS: TOrganizationTeamEmployee[] = [];

const NO_LOGS: ITimeLog[] = [];

const META_SEPARATOR = ' · ';

function isTrackingEnabledFor(team: TOrganizationTeam | null | undefined, userId: string | null) {
	if (!userId) {
		return false;
	}
	const members = team?.members ?? NO_MEMBERS;
	return members.some((member) => {
		const isCurrentUser = member.employee?.userId === userId;
		return isCurrentUser && canMemberTrackTime(member);
	});
}

/** The sheet groups the logs by member and task only while it is the view on screen. */
function sheetLogsOf(view: TimesheetView, logs: ITimeLog[]) {
	if (view === 'sheet') {
		return logs;
	}
	return NO_LOGS;
}

/** The screenshots open on the one member the filter holds, when it holds one. */
function filteredMemberIdOf(filteredMembers: ReadonlyArray<string>) {
	const hasOneMember = filteredMembers.length === 1;
	if (hasOneMember) {
		return filteredMembers[0];
	}
	return null;
}

/** The screenshots list the members with time in the period only while they are the view on screen. */
function diaryLogsOf(view: TimesheetView, logs: ITimeLog[]) {
	if (view === 'screenshots') {
		return logs;
	}
	return NO_LOGS;
}

function dayLookupOf(days: ReadonlyArray<TimesheetDay>) {
	const lookup = new Map<string, TimesheetDay>();
	for (const day of days) {
		lookup.set(day.key, day);
	}
	return lookup;
}

interface PageMetaFacts {
	periodText: string;
	showsError: boolean;
	showsMember: boolean;
	totalSeconds: number;
	memberCount: number;
}

function pageMetaOf(facts: PageMetaFacts, t: ReturnType<typeof useTranslations>) {
	const metaParts = [facts.periodText];
	if (!facts.showsError) {
		const totalText = formatDurationShort(facts.totalSeconds);
		metaParts.push(totalText);
	}
	const showsMemberCount = facts.showsMember && !facts.showsError;
	if (showsMemberCount) {
		const memberCountText = t('dashboard.timesheets.MEMBER_COUNT', { count: facts.memberCount });
		metaParts.push(memberCountText);
	}
	return metaParts.join(META_SEPARATOR);
}

/**
 * Timesheets and work diary: the time logs of a period for a manager to review (or for a member, their own diary).
 * The status cards filter every view; the default view is the week sheet of one member at a time, with the member
 * rail and the approval strip; the logs can also be listed by the day the time was worked or laid out as weeks or
 * months. Approval and rejection one by one or in bulk, editing, deleting and adding time go through the existing
 * dialogs.
 */
export function TimesheetsPage({ params }: Readonly<{ params: Promise<{ memberId: string }> }>) {
	const { memberId } = use(params);
	const t = useTranslations();
	const page = useTimesheetsPage();
	const dialogs = useTimesheetDialogs();
	const actions = useTimesheetLogActions();
	const { permissions, formatters, clearSelection } = page;

	const members = page.activeTeam?.members ?? NO_MEMBERS;
	const categories = useTimesheetFilterCategories({
		isManage: permissions.isManage,
		members,
		logs: page.allLogs,
		clients: page.clientChoices,
		canFilterByClient: page.canFilterByClient,
		hasPickedClient: page.filters.clients.length > 0
	});
	const filterControls = useTimesheetFilterControls({
		filters: page.filters,
		categories,
		onChange: page.setFilter,
		onRemove: page.removeFilterValue,
		onClear: page.clearFilters
	});

	// Always Timesheets, whoever the filter keeps: one's own day has its page, My work › Work diary
	const title = t('dashboard.timesheets.TITLE');
	const showsMember = permissions.isManage && !page.showsOwnDiaryOnly;
	const isTrackingEnabled = isTrackingEnabledFor(page.activeTeam, permissions.userId);
	const canAddTime = permissions.hasOrganizationRole;
	const dayByKey = useMemo(() => dayLookupOf(page.days), [page.days]);
	const diaryLogs = diaryLogsOf(page.view, page.allLogs);
	const diaryMembers = useMemo(() => sheetMembersOf(diaryLogs), [diaryLogs]);
	const filteredMemberId = filteredMemberIdOf(page.filters.members);

	const meta = pageMetaOf(
		{
			periodText: page.periodText,
			showsError: page.showsError,
			showsMember,
			totalSeconds: page.periodFigures.totalSeconds,
			memberCount: page.periodFigures.memberCount
		},
		t
	);

	const { changeStatus, setBillable, deleteLogs, isChangingStatus, isDeleting } = actions;
	const { openReject, openEdit, openDelete } = dialogs;

	const handlers = useMemo<TimesheetRowHandlers>(
		() => ({
			toggleLog: page.toggleLog,
			approve: (log) => {
				void changeStatus([log], ETimesheetStatus.APPROVED, true);
			},
			reject: (log) => openReject([log], 'row'),
			changeStatus: (log, status) => {
				const needsReason = status === ETimesheetStatus.DENIED;
				if (needsReason) {
					openReject([log], 'row');
					return;
				}
				void changeStatus([log], status, true);
			},
			setBillable: (log, isBillable) => {
				void setBillable(log, isBillable);
			},
			edit: openEdit,
			remove: (log) => openDelete([log], 'row')
		}),
		[changeStatus, openDelete, openEdit, openReject, page.toggleLog, setBillable]
	);

	const selectedLogs = page.selectedLogs;
	const hasSelection = selectedLogs.length > 0;
	const canDeleteSelection = selectedLogs.every((log) => canEditLog(log, permissions));
	const selectedSeconds = useMemo(() => totalDurationOf(selectedLogs), [selectedLogs]);
	const isSheetView = page.view === 'sheet';
	const isScreenshotsView = page.view === 'screenshots';
	const isSelectableView = !isSheetView && !isScreenshotsView;
	const showsSelectionBar = hasSelection && isSelectableView;
	const sheetLogs = sheetLogsOf(page.view, page.shownLogs);
	const sheet = useTimesheetSheet(sheetLogs, page.period);
	const { pendingLogs } = sheet;

	const approveSelection = async () => {
		const isDone = await changeStatus(selectedLogs, ETimesheetStatus.APPROVED, false);
		if (isDone) {
			clearSelection();
		}
	};

	const approvePending = () => {
		void changeStatus(pendingLogs, ETimesheetStatus.APPROVED, true);
	};

	const rejectPending = () => {
		openReject(pendingLogs, 'row');
	};

	const handleRejected = useCallback(() => {
		const isBulk = dialogs.rejectTarget.source === 'bulk';
		if (isBulk) {
			clearSelection();
			return;
		}
		toast.success(t('toasts.time.LOG_REJECTED'));
	}, [clearSelection, dialogs.rejectTarget.source, t]);

	const handleDeleteConfirmed = useCallback(async () => {
		const { logIds, source } = dialogs.deleteTarget;
		const isBulk = source === 'bulk';
		const announces = !isBulk;
		const isDone = await deleteLogs(logIds, announces);
		if (isDone && isBulk) {
			clearSelection();
		}
	}, [clearSelection, deleteLogs, dialogs.deleteTarget]);

	const { shownLogs } = page;
	const exportOptions = useTimesheetExportOptions({
		logs: shownLogs,
		period: page.period,
		appliedFilters: filterControls.applied,
		statusFilter: page.statusFilter,
		search: page.search
	});
	const hasShownLogs = shownLogs.length > 0;

	const actionsNode = (
		<>
			<ExportMenu options={exportOptions} isDisabled={!hasShownLogs} />
			{canAddTime && (
				<Button type="button" variant="default" size="default" onClick={dialogs.openAddTime}>
					<Plus />
					<span>{t('dashboard.timesheets.ADD_TIME')}</span>
				</Button>
			)}
		</>
	);

	let emptyMessage: ReactNode = null;
	if (page.isPeriodEmpty) {
		emptyMessage = (
			<BlockEmptyMessage
				title={t('dashboard.timesheets.EMPTY_TITLE', { period: page.periodText })}
				message={t('dashboard.timesheets.EMPTY_MESSAGE')}
				action={
					canAddTime && (
						<Button type="button" variant="outline" size="default" onClick={dialogs.openAddTime}>
							<Plus />
							<span>{t('dashboard.timesheets.ADD_TIME')}</span>
						</Button>
					)
				}
			/>
		);
	}
	const isNarrowedToNothing = !page.isPeriodEmpty && !hasShownLogs;
	if (isNarrowedToNothing) {
		emptyMessage = (
			<BlockEmptyMessage
				title={t('dashboard.timesheets.NO_MATCH_TITLE')}
				message={t('dashboard.timesheets.NO_MATCH_MESSAGE', { period: page.periodText })}
				action={
					<Button type="button" variant="outline" size="default" onClick={page.clearNarrowing}>
						{t('common.CLEAR_FILTERS')}
					</Button>
				}
			/>
		);
	}

	let body: ReactNode = null;
	if (page.showsError) {
		body = (
			<div className="p-4">
				<DashboardErrorNotice onRetry={page.retry} />
			</div>
		);
	} else if (isScreenshotsView) {
		body = (
			<TimesheetsScreenshotsView
				period={page.period}
				members={diaryMembers}
				ownEmployeeId={permissions.employeeId}
				preferredEmployeeId={filteredMemberId}
				teamId={page.activeTeam?.id ?? null}
				emptyContent={emptyMessage}
			/>
		);
	} else if (isSheetView) {
		body = (
			<TimesheetsSheetView
				state={sheet}
				formatters={formatters}
				permissions={permissions}
				handlers={handlers}
				selectedIdSet={page.selectedIdSet}
				onSelectLogs={page.setLogsSelected}
				selection={{
					count: selectedLogs.length,
					seconds: selectedSeconds,
					canDelete: canDeleteSelection,
					onApprove: () => void approveSelection(),
					onReject: () => openReject(selectedLogs, 'bulk'),
					onDelete: () => openDelete(selectedLogs, 'bulk'),
					onClear: clearSelection
				}}
				pending={{
					count: pendingLogs.length,
					seconds: sheet.pendingSeconds,
					onApprove: approvePending,
					onReject: rejectPending
				}}
				isApproving={isChangingStatus}
				emptyContent={emptyMessage}
			/>
		);
	} else if (page.view === 'week') {
		body = (
			<TimesheetsWeekView
				period={page.period}
				dayByKey={dayByKey}
				formatters={formatters}
				onOpenDay={page.openDayInList}
				notice={emptyMessage}
			/>
		);
	} else if (page.view === 'month') {
		body = (
			<TimesheetsMonthView
				period={page.period}
				dayByKey={dayByKey}
				formatters={formatters}
				onOpenDay={page.openDayInList}
				notice={emptyMessage}
			/>
		);
	} else {
		body = (
			<TimesheetsList
				days={page.days}
				visibleDayCount={page.visibleDayCount}
				collapsedDayKeys={page.collapsedDayKeys}
				onToggleDay={page.toggleDay}
				onShowMoreDays={page.showMoreDays}
				onSelectDay={page.setLogsSelected}
				showsMember={showsMember}
				selectedIdSet={page.selectedIdSet}
				permissions={permissions}
				formatters={formatters}
				handlers={handlers}
				focusedDayKey={page.focusedDayKey}
				onFocusHandled={page.clearFocusedDay}
				sort={page.sort}
				onSort={page.sortBy}
				emptyContent={emptyMessage}
			/>
		);
	}

	let report = (
		<>
			{!isScreenshotsView && (
				<TimesheetsStatusCards
					summary={page.statusSummary}
					selected={page.statusFilter}
					onSelect={page.setStatusFilter}
					isLoading={false}
					isUnavailable={page.showsError}
				/>
			)}
			<section aria-label={title} aria-busy={page.isUpdating} className={DASHBOARD_SURFACE}>
				{body}
			</section>
		</>
	);
	if (page.isInitialLoading) {
		report = (
			<TimesheetsReportSkeleton
				title={title}
				view={page.view}
				showsMember={showsMember}
				statusFilter={page.statusFilter}
				onStatusChange={page.setStatusFilter}
			/>
		);
	}

	const breadcrumbPaths = [
		{ title: page.activeTeam?.name ?? '', href: '/' },
		{ title, href: `/reports/timesheet/${memberId}` }
	];

	return (
		<PageLayout
			title={title}
			showTimer={isTrackingEnabled}
			breadcrumb={<DashboardBreadcrumb icon={<Clock aria-hidden="true" />} paths={breadcrumbPaths} />}
			mainHeaderSlot={
				<TimesheetsToolbar
					title={title}
					meta={meta}
					isMetaLoading={page.isInitialLoading}
					isUpdating={page.isUpdating}
					period={page.period}
					onPeriodChange={page.setPeriod}
					view={page.view}
					onViewChange={page.changeView}
					search={page.search}
					onSearchChange={page.setSearch}
					filterMenu={filterControls.menu}
					appliedFilters={filterControls.chips}
					actions={actionsNode}
				/>
			}
		>
			<div className={DASHBOARD_STACK}>{report}</div>
			{showsSelectionBar && (
				<TimesheetsSelectionBar
					count={selectedLogs.length}
					canApprove={permissions.canApprove}
					canDelete={canDeleteSelection}
					isApproving={isChangingStatus}
					onApprove={() => void approveSelection()}
					onReject={() => openReject(selectedLogs, 'bulk')}
					onDelete={() => openDelete(selectedLogs, 'bulk')}
					onClear={clearSelection}
				/>
			)}
			<TimesheetsDialogs
				dialogs={dialogs}
				canAddTime={canAddTime}
				isDeleting={isDeleting}
				onRejected={handleRejected}
				onDeleteConfirmed={handleDeleteConfirmed}
			/>
		</PageLayout>
	);
}
